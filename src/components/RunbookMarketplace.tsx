import { useEffect, useMemo, useState } from 'react';

import { runbookStorage, type RunbookSummary } from '../lib/runbookStorage';
import type { RunbookVisibility } from '../types/runbook';

type RunbookMarketplaceProps = {
  variant?: 'panel' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  onRun?: (runbook: RunbookSummary) => void;
};

const DEFAULT_RUNBOOK_TEMPLATE = `manifest:
  name: Example Runbook
  version: 1.0.0
  author: CopilotHub
  description: Describe what this runbook does.
  tags:
    - example
    - automation
  visibility: personal

variables: []

steps:
  - id: step-1
    tool: browser.navigate
    args:
      url: https://example.com
`;

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
  const [runbooks, setRunbooks] = useState<RunbookSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('new-runbook.yaml');
  const [editorContent, setEditorContent] = useState(DEFAULT_RUNBOOK_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);

  const filteredRunbooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return runbooks;
    }

    return runbooks.filter((runbook) => {
      const haystack = [runbook.name, runbook.description, runbook.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [runbooks, search]);

  async function loadRunbooks(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const items = await runbookStorage.listRunbooks();
      setRunbooks(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load runbooks.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRunbooks();
  }, []);

  async function handleDelete(runbook: RunbookSummary): Promise<void> {
    const confirmed = window.confirm(`Delete runbook "${runbook.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await runbookStorage.deleteRunbook(runbook.filename);
      await loadRunbooks();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete runbook.');
    }
  }

  async function handleEdit(runbook: RunbookSummary): Promise<void> {
    try {
      const content = await runbookStorage.readRunbook(runbook.filename);
      setFilenameInput(runbook.filename);
      setEditorContent(content);
      setIsEditorOpen(true);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Failed to open runbook.');
    }
  }

  function handleCreateNew(): void {
    setFilenameInput('new-runbook.yaml');
    setEditorContent(DEFAULT_RUNBOOK_TEMPLATE);
    setIsEditorOpen(true);
  }

  async function handleSaveRunbook(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await runbookStorage.writeRunbook(filenameInput, editorContent);
      setIsEditorOpen(false);
      await loadRunbooks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save runbook.');
    } finally {
      setIsSaving(false);
    }
  }

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
            onClick={handleCreateNew}
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
              onClick={() => setIsEditorOpen(false)}
              className="rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveRunbook()}
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
        ) : filteredRunbooks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-default bg-surface-elevated p-6 text-center text-sm text-text-secondary">
            No runbooks found. Create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {filteredRunbooks.map((runbook) => (
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
                    onClick={() => void handleEdit(runbook)}
                    className="rounded-md border border-border-default bg-surface-tertiary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(runbook)}
                    className="rounded-md border border-[var(--color-status-error)]/60 bg-[var(--color-status-error)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-status-error)] transition-colors hover:bg-[var(--color-status-error)]/20"
                  >
                    Delete
                  </button>
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
