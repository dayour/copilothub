import { useEffect } from 'react';

import type { RunbookSummary } from '../lib/runbookStorage';
import { useRunbookStore } from '../store/runbookStore';
import type { RunbookVisibility } from '../types/runbook';

type RunbookMarketplaceProps = {
  variant?: 'panel' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  onRun?: (runbook: RunbookSummary) => void;
};

function truncateDescription(description: string, maxLength = 140): string {
  if (description.length <= maxLength) {
    return description;
  }
  return `${description.slice(0, maxLength - 1)}…`;
}

function visibilityClasses(visibility: RunbookVisibility): string {
  switch (visibility) {
    case 'public':
      return 'bg-[var(--color-status-info)]/15 text-[var(--color-status-info)]';
    case 'enterprise':
      return 'bg-[var(--color-enterprise-blue)]/20 text-[var(--color-enterprise-blue-light)]';
    case 'personal':
    default:
      return 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]';
  }
}

export function RunbookMarketplace({
  variant = 'panel',
  isOpen = true,
  onClose,
  onRun,
}: RunbookMarketplaceProps) {
  const search = useRunbookStore((s) => s.search);
  const setSearch = useRunbookStore((s) => s.setSearch);
  const isLoading = useRunbookStore((s) => s.isLoading);
  const error = useRunbookStore((s) => s.error);
  const isEditorOpen = useRunbookStore((s) => s.isEditorOpen);
  const filenameInput = useRunbookStore((s) => s.filenameInput);
  const setFilenameInput = useRunbookStore((s) => s.setFilenameInput);
  const editorContent = useRunbookStore((s) => s.editorContent);
  const setEditorContent = useRunbookStore((s) => s.setEditorContent);
  const isSaving = useRunbookStore((s) => s.isSaving);
  const confirmDeleteId = useRunbookStore((s) => s.confirmDeleteId);
  const setConfirmDeleteId = useRunbookStore((s) => s.setConfirmDeleteId);
  const filteredRunbooks = useRunbookStore((s) => s.filteredRunbooks);
  const openEditor = useRunbookStore((s) => s.openEditor);
  const closeEditor = useRunbookStore((s) => s.closeEditor);
  const loadRunbooks = useRunbookStore((s) => s.loadRunbooks);
  const saveRunbook = useRunbookStore((s) => s.saveRunbook);
  const deleteRunbook = useRunbookStore((s) => s.deleteRunbook);
  const editRunbook = useRunbookStore((s) => s.editRunbook);

  useEffect(() => {
    void loadRunbooks();
  }, [loadRunbooks]);

  const content = (
    <section className="flex h-full w-full flex-col gap-4 rounded-lg border border-border-default bg-surface-secondary p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Runbook Marketplace</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search runbooks..."
            className="w-64 rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--color-accent-primary)]"
          />
          <button
            type="button"
            onClick={() => openEditor()}
            className="rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Create New
          </button>
          {variant === 'modal' && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              Close
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-[var(--color-status-error)]/40 bg-[var(--color-status-error)]/10 px-3 py-2 text-sm text-[var(--color-status-error)]">
          {error}
        </p>
      ) : null}

      {isEditorOpen ? (
        <div className="flex flex-col gap-3 rounded-md border border-border-default bg-surface-elevated p-3">
          <input
            type="text"
            value={filenameInput}
            onChange={(event) => setFilenameInput(event.target.value)}
            placeholder="runbook.yaml"
            className="rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--color-accent-primary)]"
          />
          <textarea
            value={editorContent}
            onChange={(event) => setEditorContent(event.target.value)}
            className="min-h-[260px] rounded-md border border-border-default bg-surface-primary p-3 font-mono text-xs text-text-primary outline-none focus:border-[var(--color-accent-primary)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveRunbook()}
              disabled={isSaving}
              className="rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading runbooks...</p>
        ) : filteredRunbooks().length === 0 ? (
          <p className="rounded-md border border-dashed border-border-default bg-surface-elevated p-6 text-center text-sm text-text-secondary">
            No runbooks found. Create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {filteredRunbooks().map((runbook) => (
              <article
                key={runbook.filename}
                className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-elevated p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{runbook.name}</h3>
                    <p className="text-xs text-text-secondary">
                      {runbook.author} · v{runbook.version}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${visibilityClasses(runbook.visibility)}`}>
                    {runbook.visibility}
                  </span>
                </div>

                <p className="text-sm text-text-secondary">{truncateDescription(runbook.description)}</p>

                <div className="flex flex-wrap gap-1.5">
                  {runbook.tags.length > 0 ? (
                    runbook.tags.map((tag) => (
                      <span
                        key={`${runbook.filename}-${tag}`}
                        className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">No tags</span>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onRun?.(runbook)}
                    className="rounded-md bg-[var(--color-accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                  >
                    Run
                  </button>
                  <button
                    type="button"
                    onClick={() => void editRunbook(runbook.filename)}
                    className="rounded-md border border-border-default bg-surface-tertiary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
                  >
                    Edit
                  </button>
                  {confirmDeleteId === runbook.filename ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void deleteRunbook(runbook.filename)}
                        className="rounded-md border border-[var(--color-status-error)]/60 bg-[var(--color-status-error)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-status-error)] transition-colors hover:bg-[var(--color-status-error)]/20"
                      >
                        Confirm Delete?
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md border border-border-default bg-surface-tertiary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(runbook.filename)}
                      className="rounded-md border border-[var(--color-status-error)]/60 bg-[var(--color-status-error)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-status-error)] transition-colors hover:bg-[var(--color-status-error)]/20"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  if (variant === 'modal') {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
        <div className="h-[85vh] w-[min(1100px,100%)]">{content}</div>
      </div>
    );
  }

  return content;
}
