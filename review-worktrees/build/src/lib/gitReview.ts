import { Command } from '@tauri-apps/plugin-shell';

export type GitReviewSnapshotKind = 'not-git' | 'clean' | 'ready';

export interface GitChange {
  path: string;
  originalPath?: string;
  statusCode: string;
  label: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
}

export interface GitReviewSnapshot {
  kind: GitReviewSnapshotKind;
  projectPath: string;
  repoRoot: string;
  branchSummary: string | null;
  files: GitChange[];
  stagedDiff: string;
  unstagedDiff: string;
}

interface GitCommandOutput {
  code: number | null;
  stdout: string;
  stderr: string;
}

function parseBranchSummary(line: string): string | null {
  if (!line.startsWith('## ')) {
    return null;
  }

  const summary = line.slice(3).trim();
  return summary.length > 0 ? summary : null;
}

function describeStatusCode(indexStatus: string, workTreeStatus: string): string {
  const combined = `${indexStatus}${workTreeStatus}`;

  if (combined === '??') return 'Untracked';
  if (combined.includes('U')) return 'Unmerged';
  if (combined.includes('R')) return 'Renamed';
  if (combined.includes('C')) return 'Copied';
  if (combined.includes('A')) return 'Added';
  if (combined.includes('D')) return 'Deleted';
  if (combined.includes('T')) return 'Type changed';
  if (combined.includes('M')) return 'Modified';
  return 'Changed';
}

function parseGitStatus(output: string): { branchSummary: string | null; files: GitChange[] } {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  let branchSummary: string | null = null;
  const files: GitChange[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      branchSummary = parseBranchSummary(line);
      continue;
    }

    const indexStatus = line[0] ?? ' ';
    const workTreeStatus = line[1] ?? ' ';
    const rawPath = line.slice(3).trim();

    if (!rawPath) {
      continue;
    }

    const renameParts = rawPath.split(' -> ');
    const originalPath = renameParts.length > 1 ? renameParts[0] : undefined;
    const path = renameParts.length > 1 ? renameParts[renameParts.length - 1] : rawPath;
    const untracked = `${indexStatus}${workTreeStatus}` === '??';

    files.push({
      path,
      originalPath,
      statusCode: `${indexStatus}${workTreeStatus}`,
      label: describeStatusCode(indexStatus, workTreeStatus),
      staged: !untracked && indexStatus !== ' ',
      unstaged: !untracked && workTreeStatus !== ' ',
      untracked,
    });
  }

  return { branchSummary, files };
}

function isNotGitRepository(output: GitCommandOutput): boolean {
  const text = `${output.stderr}\n${output.stdout}`.toLowerCase();
  return text.includes('not a git repository');
}

function buildGitFailureMessage(args: string[], output: GitCommandOutput): string {
  const detail = output.stderr.trim() || output.stdout.trim() || 'Unknown git error.';
  return `git ${args.join(' ')} failed: ${detail}`;
}

async function executeGit(args: string[], cwd: string): Promise<GitCommandOutput> {
  const result = await Command.create('git', args, { cwd }).execute();
  return {
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export async function loadGitReviewSnapshot(projectPath: string): Promise<GitReviewSnapshot> {
  const repoProbe = await executeGit(['rev-parse', '--show-toplevel'], projectPath);

  if (repoProbe.code !== 0) {
    if (isNotGitRepository(repoProbe)) {
      return {
        kind: 'not-git',
        projectPath,
        repoRoot: projectPath,
        branchSummary: null,
        files: [],
        stagedDiff: '',
        unstagedDiff: '',
      };
    }

    throw new Error(buildGitFailureMessage(['rev-parse', '--show-toplevel'], repoProbe));
  }

  const repoRoot = repoProbe.stdout.trim() || projectPath;
  const statusOutput = await executeGit(
    ['status', '--short', '--branch', '--untracked-files=all'],
    repoRoot,
  );

  if (statusOutput.code !== 0) {
    throw new Error(buildGitFailureMessage(['status', '--short', '--branch', '--untracked-files=all'], statusOutput));
  }

  const parsedStatus = parseGitStatus(statusOutput.stdout);

  if (parsedStatus.files.length === 0) {
    return {
      kind: 'clean',
      projectPath,
      repoRoot,
      branchSummary: parsedStatus.branchSummary,
      files: [],
      stagedDiff: '',
      unstagedDiff: '',
    };
  }

  const [stagedOutput, unstagedOutput] = await Promise.all([
    executeGit(['diff', '--cached', '--no-ext-diff', '--minimal', '--patch', '--stat'], repoRoot),
    executeGit(['diff', '--no-ext-diff', '--minimal', '--patch', '--stat'], repoRoot),
  ]);

  if (stagedOutput.code !== 0) {
    throw new Error(buildGitFailureMessage(['diff', '--cached', '--no-ext-diff', '--minimal', '--patch', '--stat'], stagedOutput));
  }

  if (unstagedOutput.code !== 0) {
    throw new Error(buildGitFailureMessage(['diff', '--no-ext-diff', '--minimal', '--patch', '--stat'], unstagedOutput));
  }

  return {
    kind: 'ready',
    projectPath,
    repoRoot,
    branchSummary: parsedStatus.branchSummary,
    files: parsedStatus.files,
    stagedDiff: stagedOutput.stdout.trim(),
    unstagedDiff: unstagedOutput.stdout.trim(),
  };
}

export function formatGitReviewError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to load git review data.';
}
