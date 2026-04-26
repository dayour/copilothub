import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, FolderPlus } from 'lucide-react';
import { readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { useAppStore } from '../store/appStore';

interface ProjectSidebarProps {
  onAddProject: () => void | Promise<void>;
}

interface WorkspaceEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

function getProjectLabel(projectPath: string | null): string {
  if (!projectPath) {
    return 'No workspace selected';
  }

  const segments = projectPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? projectPath;
}

function sortEntries(entries: WorkspaceEntry[]): WorkspaceEntry[] {
  return [...entries].sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  });
}

export function ProjectSidebar({ onAddProject }: ProjectSidebarProps) {
  const projectSidebarCollapsed = useAppStore((state) => state.projectSidebarCollapsed);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);
  const recentProjects = useAppStore((state) => state.recentProjects);
  const toggleProjectSidebar = useAppStore((state) => state.toggleProjectSidebar);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);

  const [entriesByPath, setEntriesByPath] = useState<Record<string, WorkspaceEntry[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [treeError, setTreeError] = useState<string | null>(null);

  const projectLabel = useMemo(() => getProjectLabel(currentProjectPath), [currentProjectPath]);

  const loadDirectory = useCallback(async (directoryPath: string) => {
    setLoadingPaths((prev) => {
      const next = new Set(prev);
      next.add(directoryPath);
      return next;
    });

    try {
      const entries = await readDir(directoryPath);
      const resolvedEntries = await Promise.all(
        entries
          .filter((entry) => typeof entry.name === 'string' && entry.name.trim().length > 0)
          .map(async (entry) => ({
            name: entry.name,
            path: await join(directoryPath, entry.name),
            isDirectory: entry.isDirectory,
            isFile: entry.isFile,
          })),
      );

      setEntriesByPath((prev) => ({
        ...prev,
        [directoryPath]: sortEntries(resolvedEntries),
      }));
      setTreeError(null);
    } catch {
      setTreeError('Unable to load workspace files.');
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(directoryPath);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!currentProjectPath) {
      setEntriesByPath({});
      setExpandedPaths(new Set());
      setTreeError(null);
      return;
    }

    setEntriesByPath({});
    setExpandedPaths(new Set([currentProjectPath]));
    void loadDirectory(currentProjectPath);
  }, [currentProjectPath, loadDirectory]);

  const handleToggleDirectory = useCallback(async (entry: WorkspaceEntry) => {
    if (!entry.isDirectory) {
      return;
    }

    const isExpanded = expandedPaths.has(entry.path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(entry.path);
      } else {
        next.add(entry.path);
      }
      return next;
    });

    if (!isExpanded && entriesByPath[entry.path] === undefined) {
      await loadDirectory(entry.path);
    }
  }, [entriesByPath, expandedPaths, loadDirectory]);

  const renderEntries = useCallback((directoryPath: string, depth = 0) => {
    const entries = entriesByPath[directoryPath] ?? [];
    const isLoading = loadingPaths.has(directoryPath);

    if (!isLoading && entries.length === 0) {
      return (
        <div
          className="text-[12px] text-text-muted"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          No files found.
        </div>
      );
    }

    return (
      <ul className="space-y-1">
        {entries.map((entry) => {
          const isExpanded = expandedPaths.has(entry.path);
          const isEntryLoading = loadingPaths.has(entry.path);

          return (
            <li key={entry.path}>
              <button
                type="button"
                onClick={() => {
                  if (entry.isDirectory) {
                    void handleToggleDirectory(entry);
                  }
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-[12px] text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                style={{ paddingLeft: `${12 + depth * 14}px` }}
                aria-label={entry.isDirectory ? `${isExpanded ? 'Collapse' : 'Expand'} ${entry.name}` : entry.name}
              >
                {entry.isDirectory ? (
                  isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />
                ) : (
                  <span className="w-[14px] shrink-0" />
                )}
                {entry.isDirectory ? (
                  isExpanded ? <FolderOpen size={14} className="shrink-0 text-accent-primary" /> : <Folder size={14} className="shrink-0 text-accent-primary" />
                ) : (
                  <FileText size={14} className="shrink-0 text-text-muted" />
                )}
                <span className="truncate">{entry.name}</span>
              </button>

              {entry.isDirectory && isExpanded && (
                <div className="space-y-1">
                  {isEntryLoading && entriesByPath[entry.path] === undefined ? (
                    <div
                      className="text-[12px] text-text-muted"
                      style={{ paddingLeft: `${26 + depth * 14}px` }}
                    >
                      Loading...
                    </div>
                  ) : (
                    renderEntries(entry.path, depth + 1)
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }, [entriesByPath, expandedPaths, handleToggleDirectory, loadingPaths]);

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-border-default bg-surface-secondary transition-[width] duration-200 ease-out"
      style={{ width: projectSidebarCollapsed ? '56px' : '280px' }}
      aria-label="Project sidebar"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-default px-3 py-3">
        {!projectSidebarCollapsed && (
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">Projects</div>
            <div className="truncate text-[13px] font-semibold text-text-primary">{projectLabel}</div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleProjectSidebar}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label={projectSidebarCollapsed ? 'Expand project sidebar' : 'Collapse project sidebar'}
          title={projectSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {projectSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="flex flex-col gap-3 p-2">
        <button
          type="button"
          onClick={() => {
            void onAddProject();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border-default bg-surface-tertiary px-3 py-2 text-[12px] font-medium text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Add project"
          title="Add project (Ctrl+O)"
        >
          <FolderPlus size={15} />
          {!projectSidebarCollapsed && <span>Add Project</span>}
        </button>
      </div>

      {!projectSidebarCollapsed && (
        <>
          <section className="border-b border-border-default px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-text-muted">Current Workspace</div>
            <div className="mt-2 text-[13px] font-medium text-text-primary">{projectLabel}</div>
            <div className="mt-1 break-all text-[11px] text-text-muted">
              {currentProjectPath ?? 'Choose a project folder to populate the workspace tree.'}
            </div>
          </section>

          <section className="border-b border-border-default px-3 py-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">Recent Projects</div>
            {recentProjects.length === 0 ? (
              <div className="text-[12px] text-text-muted">
                No recent projects yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {recentProjects.map((projectPath) => {
                  const isActive = projectPath === currentProjectPath;
                  return (
                    <li key={projectPath}>
                      <button
                        type="button"
                        onClick={() => setCurrentProject(projectPath)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${
                          isActive
                            ? 'bg-surface-hover text-text-primary'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        }`}
                      >
                        <div className="truncate font-medium">{getProjectLabel(projectPath)}</div>
                        <div className="truncate text-[11px] text-text-muted">{projectPath}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide text-text-muted">Files</div>
              {currentProjectPath && (
                <button
                  type="button"
                  onClick={() => {
                    void loadDirectory(currentProjectPath);
                  }}
                  className="rounded-md px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!currentProjectPath ? (
                <div className="text-[12px] text-text-muted">
                  Select a project to browse its files.
                </div>
              ) : treeError ? (
                <div className="text-[12px] text-status-error">{treeError}</div>
              ) : loadingPaths.has(currentProjectPath) && entriesByPath[currentProjectPath] === undefined ? (
                <div className="text-[12px] text-text-muted">Loading workspace files...</div>
              ) : (
                renderEntries(currentProjectPath)
              )}
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
