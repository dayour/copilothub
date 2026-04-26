import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitBranch,
  MessageSquare,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  formatGitReviewError,
  loadGitReviewSnapshot,
  type GitChange,
  type GitReviewSnapshot,
} from '../lib/gitReview';

type GitReviewPaneState =
  | { kind: 'no-project' }
  | { kind: 'loading' }
  | { kind: 'not-git'; snapshot: GitReviewSnapshot }
  | { kind: 'clean'; snapshot: GitReviewSnapshot }
  | { kind: 'ready'; snapshot: GitReviewSnapshot }
  | { kind: 'error'; message: string };

function getProjectLabel(projectPath: string | null): string {
  if (!projectPath) {
    return 'No project selected';
  }

  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? projectPath;
}

function pillClass(tone: 'neutral' | 'info' | 'success' | 'warning'): string {
  switch (tone) {
    case 'info':
      return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
    case 'success':
      return 'border-status-success/40 bg-status-success/10 text-status-success';
    case 'warning':
      return 'border-status-warning/40 bg-status-warning/10 text-status-warning';
    case 'neutral':
    default:
      return 'border-border-subtle bg-surface-tertiary/70 text-text-secondary';
  }
}

function changeTone(change: GitChange): 'info' | 'success' | 'warning' | 'neutral' {
  if (change.untracked) return 'info';
  if (change.staged && change.unstaged) return 'warning';
  if (change.staged) return 'success';
  if (change.unstaged) return 'warning';
  return 'neutral';
}

function diffLineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git')) {
    return 'text-accent-primary';
  }

  if (line.startsWith('+')) {
    return 'text-status-success';
  }

  if (line.startsWith('-')) {
    return 'text-status-error';
  }

  if (line.startsWith('@@')) {
    return 'text-status-warning';
  }

  return 'text-text-secondary';
}

function DiffSection({
  title,
  diff,
  emptyMessage,
}: {
  title: string;
  diff: string;
  emptyMessage: string;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-tertiary/70">
      <div className="border-b border-border-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </div>
      {diff.trim().length === 0 ? (
        <div className="px-3 py-3 text-[12px] text-text-muted">{emptyMessage}</div>
      ) : (
        <pre className="max-h-[20rem] overflow-auto px-3 py-3 text-[12px] leading-5 whitespace-pre-wrap break-all font-mono">
          {diff.split('\n').map((line, index) => (
            <div key={`${title}-${index}`} className={diffLineClass(line)}>
              {line || ' '}
            </div>
          ))}
        </pre>
      )}
    </section>
  );
}

export function GitReviewPane() {
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);
  const openCopilotPane = useAppStore((state) => state.openCopilotPane);
  const toggleCopilotSidebar = useAppStore((state) => state.toggleCopilotSidebar);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<GitReviewPaneState>(() => (
    currentProjectPath ? { kind: 'loading' } : { kind: 'no-project' }
  ));

  useEffect(() => {
    if (!currentProjectPath) {
      setState({ kind: 'no-project' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void loadGitReviewSnapshot(currentProjectPath)
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        if (snapshot.kind === 'not-git') {
          setState({ kind: 'not-git', snapshot });
          return;
        }

        if (snapshot.kind === 'clean') {
          setState({ kind: 'clean', snapshot });
          return;
        }

        setState({ kind: 'ready', snapshot });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ kind: 'error', message: formatGitReviewError(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectPath, refreshKey]);

  const counts = useMemo(() => {
    if (state.kind !== 'ready' && state.kind !== 'clean' && state.kind !== 'not-git') {
      return {
        staged: 0,
        unstaged: 0,
        untracked: 0,
      };
    }

    return {
      staged: state.snapshot.files.filter((file) => file.staged).length,
      unstaged: state.snapshot.files.filter((file) => file.unstaged).length,
      untracked: state.snapshot.files.filter((file) => file.untracked).length,
    };
  }, [state]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-border-default bg-surface-secondary"
      aria-label="Git review pane"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-default px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
            <GitBranch size={15} />
            <span>Git Review</span>
          </div>
          <div className="truncate text-[11px] text-text-muted">
            {getProjectLabel(currentProjectPath)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Refresh Git review"
            title="Refresh Git review"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={openCopilotPane}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Open Copilot pane"
            title="Open Copilot pane"
          >
            <MessageSquare size={15} />
          </button>
          <button
            type="button"
            onClick={toggleCopilotSidebar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Close assistant pane"
            title="Close assistant pane"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${pillClass('success')}`}>
            Staged {counts.staged}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${pillClass('warning')}`}>
            Unstaged {counts.unstaged}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${pillClass('info')}`}>
            Untracked {counts.untracked}
          </span>
        </div>

        {state.kind === 'no-project' && (
          <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3 text-[12px] text-text-secondary">
            Choose a project folder from the left sidebar to load git status and diffs.
          </div>
        )}

        {state.kind === 'loading' && (
          <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3 text-[12px] text-text-secondary">
            Loading git changes for the current project.
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-status-error/40 bg-status-error/10 p-3 text-[12px] text-status-error">
            {state.message}
          </div>
        )}

        {state.kind === 'not-git' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3">
              <div className="text-[12px] font-medium text-text-primary">This folder is not a git repository</div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                Initialize git or switch to a tracked project to use the review pane.
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3 text-[12px] text-text-muted">
              Folder: {state.snapshot.projectPath}
            </div>
          </div>
        )}

        {state.kind === 'clean' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3">
              <div className="text-[12px] font-medium text-text-primary">No local changes</div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                Working tree and index are clean for this repository.
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3 text-[12px] text-text-muted">
              Branch: {state.snapshot.branchSummary ?? 'Unknown branch'}
            </div>
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-4">
            <section className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3">
              <div className="text-[11px] uppercase tracking-wide text-text-muted">Repository</div>
              <div className="mt-1 text-[13px] font-medium text-text-primary">
                {state.snapshot.branchSummary ?? 'Detached HEAD'}
              </div>
              <div className="mt-1 break-all text-[12px] text-text-muted">
                {state.snapshot.repoRoot}
              </div>
            </section>

            <section className="rounded-lg border border-border-subtle bg-surface-tertiary/70 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">
                Changed Files
              </div>
              <ul className="space-y-2">
                {state.snapshot.files.map((file) => (
                  <li
                    key={`${file.statusCode}-${file.originalPath ?? ''}-${file.path}`}
                    className="rounded-md border border-border-subtle bg-surface-primary/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass(changeTone(file))}`}>
                        {file.label}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">{file.statusCode}</span>
                    </div>
                    {file.originalPath ? (
                      <div className="mt-1 text-[12px] text-text-primary">
                        {file.originalPath} to {file.path}
                      </div>
                    ) : (
                      <div className="mt-1 break-all text-[12px] text-text-primary">{file.path}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <DiffSection
              title="Staged Diff"
              diff={state.snapshot.stagedDiff}
              emptyMessage="No staged patch output. Stage a file to see indexed diff details."
            />

            <DiffSection
              title="Working Tree Diff"
              diff={state.snapshot.unstagedDiff}
              emptyMessage="No unstaged patch output. Untracked files appear in the file list until they are staged."
            />
          </div>
        )}
      </div>
    </aside>
  );
}
