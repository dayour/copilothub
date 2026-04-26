// ---------------------------------------------------------------------------
// WorkspaceBar.tsx -- Workspace switcher strip with record and snapshot
// Sits between the TitleBar and TabBar in the CopilotHub shell.
// ---------------------------------------------------------------------------

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Plus,
  Camera,
  Circle,
  FolderInput,
  Trash2,
  Pencil,
  Palette,
  X,
  Check,
  FolderOpen,
  Globe,
} from 'lucide-react';
import {
  useWorkspaceStore,
  WORKSPACE_COLORS,
} from '../store/workspaceStore';
import { loadEdgeBookmarks, type EdgeImportResult } from '../lib/edgeImport';

// ---------------------------------------------------------------------------
// Recording timer display
// ---------------------------------------------------------------------------

function RecordingTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <span className="ml-1 text-[10px] font-mono text-[#f44747] tabular-nums">
      {minutes}:{seconds}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Color picker popover
// ---------------------------------------------------------------------------

function ColorPicker({
  currentColor,
  onSelect,
  onClose,
}: {
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 mt-1 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-2 shadow-lg"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {WORKSPACE_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => {
              onSelect(c.value);
              onClose();
            }}
            className="group relative flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: c.value }}
            title={c.name}
          >
            {c.value === currentColor && (
              <Check size={12} className="text-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace context menu (right-click)
// ---------------------------------------------------------------------------

interface ContextMenuState {
  wsId: string;
  x: number;
  y: number;
}

function WorkspaceContextMenu({
  wsId,
  position,
  onClose,
}: {
  wsId: string;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const ref = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const setWorkspaceColor = useWorkspaceStore((s) => s.setWorkspaceColor);
  const ws = workspaces.find((w) => w.id === wsId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!ws) return null;

  if (isRenaming) {
    return (
      <div
        ref={ref}
        className="fixed z-[100] rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-2 shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' && renameValue.trim()) {
                renameWorkspace(wsId, renameValue.trim());
                onClose();
              }
              if (e.key === 'Escape') onClose();
            }}
            className="h-6 w-32 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)]"
          />
          <button
            type="button"
            onClick={() => {
              if (renameValue.trim()) {
                renameWorkspace(wsId, renameValue.trim());
              }
              onClose();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-status-success)] hover:bg-[var(--color-surface-hover)]"
          >
            <Check size={12} />
          </button>
        </div>
      </div>
    );
  }

  const menuItemClass =
    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]';

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[160px] rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <button
        type="button"
        className={menuItemClass}
        onClick={() => {
          setRenameValue(ws.name);
          setIsRenaming(true);
        }}
      >
        <Pencil size={12} />
        Rename
      </button>
      <div className="relative">
        <button
          type="button"
          className={menuItemClass}
          onClick={() => setShowColorPicker(!showColorPicker)}
        >
          <Palette size={12} />
          Change Color
        </button>
        {showColorPicker && (
          <ColorPicker
            currentColor={ws.color}
            onSelect={(color) => {
              setWorkspaceColor(wsId, color);
              onClose();
            }}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
      {workspaces.length > 1 && (
        <>
          <div className="my-1 border-t border-[var(--color-border-default)]" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-status-error)] transition-colors hover:bg-[var(--color-status-error)]/10"
            onClick={() => {
              deleteWorkspace(wsId);
              onClose();
            }}
          >
            <Trash2 size={12} />
            Delete Workspace
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edge import panel
// ---------------------------------------------------------------------------

function EdgeImportPanel({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EdgeImportResult | null>(null);
  const importAsWorkspace = useWorkspaceStore((s) => s.importAsWorkspace);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadEdgeBookmarks()
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to read Edge bookmarks',
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          Import from Edge
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        >
          <X size={12} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {loading && (
          <div className="flex items-center justify-center py-6 text-xs text-[var(--color-text-muted)]">
            Reading Edge bookmarks...
          </div>
        )}

        {error && (
          <div className="px-3 py-4 text-center text-xs text-[var(--color-status-error)]">
            {error}
          </div>
        )}

        {result && result.flatList.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
            No bookmark folders found in Edge.
          </div>
        )}

        {result &&
          result.flatList.map((item) => (
            <button
              key={item.path}
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
              style={{ paddingLeft: `${8 + item.depth * 12}px` }}
              onClick={() => {
                const wsId = importAsWorkspace(
                  item.folder.name,
                  item.folder.bookmarks,
                );
                switchWorkspace(wsId);
                onClose();
              }}
            >
              <FolderOpen
                size={14}
                className="shrink-0 text-[var(--color-text-secondary)]"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-primary)]">
                {item.folder.name}
              </span>
              <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                {item.totalBookmarks} link{item.totalBookmarks !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add workspace dropdown
// ---------------------------------------------------------------------------

function AddWorkspaceDropdown({ onClose }: { onClose: () => void }) {
  const [showEdgeImport, setShowEdgeImport] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const saveCurrentAsWorkspace = useWorkspaceStore(
    (s) => s.saveCurrentAsWorkspace,
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (showEdgeImport) {
    return (
      <div ref={ref} className="relative">
        <EdgeImportPanel
          onClose={() => {
            setShowEdgeImport(false);
            onClose();
          }}
        />
      </div>
    );
  }

  if (showNewInput) {
    return (
      <div
        ref={ref}
        className="absolute left-0 top-full z-50 mt-1 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-2 shadow-xl"
      >
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' && newName.trim()) {
                createWorkspace(newName.trim());
                onClose();
              }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Workspace name"
            className="h-6 w-36 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] px-2 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
          />
          <button
            type="button"
            onClick={() => {
              if (newName.trim()) createWorkspace(newName.trim());
              onClose();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-status-success)] hover:bg-[var(--color-surface-hover)]"
          >
            <Check size={12} />
          </button>
        </div>
      </div>
    );
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]';

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-1 shadow-xl"
    >
      <button
        type="button"
        className={itemClass}
        onClick={() => setShowNewInput(true)}
      >
        <Plus size={12} />
        New Empty Workspace
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          saveCurrentAsWorkspace('New Workspace');
          onClose();
        }}
      >
        <Globe size={12} />
        Save Current Tabs As...
      </button>
      <div className="my-1 border-t border-[var(--color-border-default)]" />
      <button
        type="button"
        className={itemClass}
        onClick={() => setShowEdgeImport(true)}
      >
        <FolderInput size={12} />
        Import from Edge
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main WorkspaceBar component
// ---------------------------------------------------------------------------

export function WorkspaceBar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const isRecording = useWorkspaceStore((s) => s.isRecording);
  const recordingStartedAt = useWorkspaceStore((s) => s.recordingStartedAt);
  const toggleRecording = useWorkspaceStore((s) => s.toggleRecording);
  const triggerSnapshot = useWorkspaceStore((s) => s.triggerSnapshot);

  const [showDropdown, setShowDropdown] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null,
  );
  const dropdownAnchorRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, wsId: string) => {
      e.preventDefault();
      setContextMenu({ wsId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  return (
    <div
      className="flex h-[30px] w-full items-center border-b border-[var(--color-border-default)] px-2"
      style={{ backgroundColor: 'var(--color-workspace-bar-bg, #1c1c20)' }}
    >
      {/* Workspace tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => switchWorkspace(ws.id)}
              onContextMenu={(e) => handleContextMenu(e, ws.id)}
              className={`
                group relative flex h-[22px] items-center gap-1.5 rounded-[4px] px-2.5 text-[11px]
                transition-all duration-150
                ${
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }
              `}
              style={{
                backgroundColor: isActive
                  ? `${ws.color}18`
                  : 'transparent',
              }}
              title={ws.name}
            >
              {/* Color indicator dot */}
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ backgroundColor: ws.color }}
              />
              <span className="max-w-[100px] truncate font-medium">
                {ws.name}
              </span>
              {/* Active underline accent */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: ws.color }}
                />
              )}
            </button>
          );
        })}

        {/* Add workspace button */}
        <div ref={dropdownAnchorRef} className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="ml-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)]"
            aria-label="Add workspace"
            title="Add workspace"
          >
            <Plus size={12} />
          </button>
          {showDropdown && (
            <AddWorkspaceDropdown onClose={() => setShowDropdown(false)} />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-2 h-3.5 w-px bg-[var(--color-border-default)]" />

      {/* Utility buttons: Record and Snapshot */}
      <div className="flex items-center gap-1">
        {/* Record button */}
        <button
          type="button"
          onClick={toggleRecording}
          className={`
            flex h-[22px] items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium
            transition-all duration-150
            ${
              isRecording
                ? 'bg-[#f44747]/15 text-[#f44747]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)]'
            }
          `}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <Circle
            size={8}
            className={isRecording ? 'fill-[#f44747] animate-[recording-pulse_1.4s_ease-in-out_infinite]' : ''}
          />
          {isRecording ? (
            <>
              REC
              {recordingStartedAt && (
                <RecordingTimer startedAt={recordingStartedAt} />
              )}
            </>
          ) : (
            'Record'
          )}
        </button>

        {/* Snapshot button */}
        <button
          type="button"
          onClick={triggerSnapshot}
          className="flex h-[22px] items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-all duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] active:scale-95"
          title="Take snapshot"
        >
          <Camera size={11} />
          Snapshot
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <WorkspaceContextMenu
          wsId={contextMenu.wsId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
