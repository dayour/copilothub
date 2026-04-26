import type {
  VsCodeExtensionHostStatus,
  VsCodeLocalExtension,
} from './vscodeExtensions';

export type VsCodeExtensionRuntimeState =
  | 'runtime-ready'
  | 'staged'
  | 'metadata-only'
  | 'attention-required';

export type VsCodeExtensionSummaryTone = 'success' | 'warning' | 'neutral' | 'danger';

export interface VsCodeExtensionRuntimeSummary {
  state: VsCodeExtensionRuntimeState;
  label: string;
  description: string;
  tone: VsCodeExtensionSummaryTone;
}

function hasRuntimeEntryPoint(extension: VsCodeLocalExtension): boolean {
  return Boolean(extension.entryPoints.main || extension.entryPoints.browser);
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getVsCodeExtensionRuntimeSummary(
  extension: VsCodeLocalExtension,
  hostStatus: Pick<VsCodeExtensionHostStatus, 'canExecuteExtensions'>,
): VsCodeExtensionRuntimeSummary {
  if (extension.warnings.length > 0) {
    return {
      state: 'attention-required',
      label: 'Needs attention',
      description: extension.warnings[0],
      tone: 'danger',
    };
  }

  if (hostStatus.canExecuteExtensions && hasRuntimeEntryPoint(extension)) {
    return {
      state: 'runtime-ready',
      label: 'Runtime ready',
      description: 'Bridge execution is available and this extension exposes a runtime entry point.',
      tone: 'success',
    };
  }

  if (hasRuntimeEntryPoint(extension)) {
    return {
      state: 'staged',
      label: 'Staged',
      description: 'Manifest and runtime entry points were discovered, but activation remains staged behind the bridge.',
      tone: 'warning',
    };
  }

  return {
    state: 'metadata-only',
    label: 'Metadata only',
    description: 'The extension manifest was discovered, but no runtime entry point is exposed yet.',
    tone: 'neutral',
  };
}

export function filterVsCodeExtensions(
  extensions: VsCodeLocalExtension[],
  query: string,
): VsCodeLocalExtension[] {
  const normalizedTerms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (normalizedTerms.length === 0) {
    return extensions;
  }

  return extensions.filter((extension) => {
    const searchableText = [
      extension.id,
      extension.name,
      extension.displayName ?? '',
      extension.publisher ?? '',
      extension.description ?? '',
      extension.path,
      extension.manifestPath,
      ...extension.categories,
      ...extension.keywords,
      ...extension.extensionKind,
      ...extension.activationEvents,
    ]
      .join(' ')
      .toLowerCase();

    return normalizedTerms.every((term) => searchableText.includes(term));
  });
}

export function formatVsCodeExtensionContributionSummary(
  extension: Pick<VsCodeLocalExtension, 'contributes'>,
): string {
  const parts: string[] = [];

  if (extension.contributes.commands > 0) {
    parts.push(pluralize(extension.contributes.commands, 'command'));
  }

  if (extension.contributes.languages > 0) {
    parts.push(pluralize(extension.contributes.languages, 'language'));
  }

  if (extension.contributes.debuggers > 0) {
    parts.push(pluralize(extension.contributes.debuggers, 'debugger'));
  }

  if (extension.contributes.views > 0) {
    parts.push(pluralize(extension.contributes.views, 'view'));
  }

  return parts.length > 0 ? parts.join(', ') : 'No declared contributions';
}
