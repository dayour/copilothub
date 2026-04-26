import { useEffect, useMemo, useState } from 'react';
import { PencilLine, Plus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';

function getProjectLabel(projectPath: string | null): string {
  if (!projectPath) return 'Current Workspace';

  const segments = projectPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? projectPath;
}

export function ChatThreadBar() {
  const currentProjectPath = useAppStore((s) => s.currentProjectPath);
  const threads = useSessionEnvironmentStore((s) => s.threads);
  const selectedThreadId = useSessionEnvironmentStore((s) => s.selectedThreadId);
  const createThread = useSessionEnvironmentStore((s) => s.createThread);
  const selectThread = useSessionEnvironmentStore((s) => s.selectThread);
  const renameThread = useSessionEnvironmentStore((s) => s.renameThread);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const activeProjectPath = currentProjectPath ?? selectedThread?.projectPath ?? null;
  const projectThreads = useMemo(
    () =>
      activeProjectPath
        ? threads.filter((thread) => thread.projectPath === activeProjectPath)
        : [],
    [activeProjectPath, threads],
  );

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    if (!activeProjectPath) return;

    if (projectThreads.length === 0) {
      createThread({ projectPath: activeProjectPath });
      return;
    }

    if (!selectedThread || selectedThread.projectPath !== activeProjectPath) {
      selectThread(projectThreads[0].id);
    }
  }, [
    activeProjectPath,
    createThread,
    projectThreads,
    selectThread,
    selectedThread,
  ]);

  const threadCountLabel = useMemo(() => {
    if (projectThreads.length === 1) return '1 thread';
    return `${projectThreads.length} threads`;
  }, [projectThreads.length]);

  function handleCreateThread() {
    if (!activeProjectPath) return;
    createThread({ projectPath: activeProjectPath });
    setEditingThreadId(null);
    setDraftTitle('');
  }

  function beginRename(threadId: string, title: string) {
    setEditingThreadId(threadId);
    setDraftTitle(title);
  }

  function commitRename(threadId: string) {
    renameThread(threadId, draftTitle);
    setEditingThreadId(null);
    setDraftTitle('');
  }

  return (
    <div className="border-b border-border-default bg-surface-secondary/70 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">
            Parallel Threads
          </div>
          <div className="truncate text-[12px] text-text-secondary">
            {getProjectLabel(activeProjectPath)}. {threadCountLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreateThread}
          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[12px] text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Create thread"
        >
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {projectThreads.map((thread) => {
          const isSelected = selectedThread?.id === thread.id;
          const isEditing = editingThreadId === thread.id;

          return (
            <div
              key={thread.id}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border-subtle bg-surface-tertiary'
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={() => commitRename(thread.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitRename(thread.id);
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setEditingThreadId(null);
                      setDraftTitle('');
                    }
                  }}
                  className="min-w-[120px] bg-transparent text-[12px] text-text-primary outline-none"
                  aria-label={`Rename ${thread.title}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={`text-[12px] ${
                    isSelected ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  aria-pressed={isSelected}
                >
                  {thread.title}
                </button>
              )}

              {isSelected && !isEditing && (
                <button
                  type="button"
                  onClick={() => beginRename(thread.id, thread.title)}
                  className="rounded p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
                  aria-label={`Rename thread ${thread.title}`}
                >
                  <PencilLine size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
