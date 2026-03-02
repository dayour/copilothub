import { useState, type ComponentType } from 'react';
import {
  Globe,
  MessageSquare,
  Code,
  Terminal,
  Plus,
  X,
  type LucideProps,
} from 'lucide-react';
import { useTabStore, type TabType } from '../store/tabStore';
import { useAppStore } from '../store/appStore';
import TabContextMenu from './TabContextMenu';

const TAB_ICON_SIZE = 16;

type TabIconComponent = ComponentType<LucideProps>;

const TAB_ICONS: Record<TabType, TabIconComponent> = {
  browser: Globe,
  chat: MessageSquare,
  vscode: Code,
  terminal: Terminal,
};

function TypeIcon({ type }: { type: TabType }) {
  const Icon = TAB_ICONS[type];
  return (
    <Icon
      size={TAB_ICON_SIZE}
      className="shrink-0 text-[var(--color-text-secondary)]"
      aria-hidden="true"
    />
  );
}

export function TabBar({ vertical }: { vertical?: boolean }) {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const verticalTabsEnabled = useAppStore((state) => state.verticalTabsEnabled);
  const isVertical = vertical ?? verticalTabsEnabled;

  const [brokenFavicons, setBrokenFavicons] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);

  const handleFaviconError = (tabId: string) => {
    setBrokenFavicons((prev) => {
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  };

  if (isVertical) {
    return (
      <>
        <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
        <div className="flex h-[36px] items-center justify-end border-b border-[var(--color-border-default)] px-2">
          <button
            type="button"
            onClick={() => addTab('browser')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="New tab"
            title="New tab"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const isFaviconAvailable = Boolean(tab.favicon) && !brokenFavicons.has(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
                  }}
                  className={`group flex h-[36px] w-full items-center gap-2 rounded-md px-2 text-left transition-colors ${
                    tab.isActive
                      ? 'bg-[var(--color-tab-active)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-tab-inactive)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isFaviconAvailable ? (
                      <img
                        src={tab.favicon}
                        alt=""
                        className="h-4 w-4"
                        onError={() => handleFaviconError(tab.id)}
                      />
                    ) : (
                      <TypeIcon type={tab.type} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm">{tab.title}</span>

                  {!tab.isPinned && (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                      role="button"
                      aria-label={`Close ${tab.title}`}
                      title="Close tab"
                    >
                      <X size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </aside>
        {contextMenu && (
          <TabContextMenu
            tabId={contextMenu.tabId}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex h-[36px] w-full items-center border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const isFaviconAvailable = Boolean(tab.favicon) && !brokenFavicons.has(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
                }}
                className={`group flex h-7 shrink-0 items-center rounded-md transition-colors ${
                  tab.isPinned ? 'w-9 justify-center px-0' : 'max-w-[220px] gap-2 px-2'
                } ${
                  tab.isActive
                    ? 'bg-[var(--color-tab-active)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-tab-inactive)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]'
                }`}
                title={tab.title}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isFaviconAvailable ? (
                    <img
                      src={tab.favicon}
                      alt=""
                      className="h-4 w-4"
                      onError={() => handleFaviconError(tab.id)}
                    />
                  ) : (
                    <TypeIcon type={tab.type} />
                  )}
                </span>

                {!tab.isPinned && <span className="max-w-[150px] truncate text-xs">{tab.title}</span>}

                {!tab.isPinned && (
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                    role="button"
                    aria-label={`Close ${tab.title}`}
                  >
                    <X size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => addTab('browser')}
          className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
          aria-label="New tab"
          title="New tab"
        >
          <Plus size={16} />
        </button>
      </div>
      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export default TabBar;
