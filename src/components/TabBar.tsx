import React, { useCallback, useState, type ComponentType } from 'react';
import {
  Globe,
  MessageSquare,
  Code,
  Terminal,
  BookOpen,
  Plus,
  X,
  Calendar,
  Wrench,
  Coffee,
  LayoutTemplate,
  Zap,
  Bot,
  Layers3,
  Film,
  Sparkles,
  BarChart3,
  FileCheck,
  Headphones,
  Users,
  Truck,
  Fuel,
  MousePointerClick,
  Settings2,
  type LucideProps,
} from 'lucide-react';
import { useTabStore, type Tab, type TabType } from '../store/tabStore';
import { useAppStore } from '../store/appStore';
import { useBrowserActionStore } from '../store/browserActionStore';
import TabContextMenu from './TabContextMenu';

const TAB_ICON_SIZE = 16;

type TabIconComponent = ComponentType<LucideProps>;

const TAB_ICONS: Record<TabType, TabIconComponent> = {
  browser: Globe,
  'browser-use': MousePointerClick,
  chat: MessageSquare,
  vscode: Code,
  terminal: Terminal,
  runbook: BookOpen,
  'copilot-studio': Bot,
  'power-platform': Layers3,
  'demo-calendar': Calendar,
  'demo-mechanic': Wrench,
  'demo-coffeeshop': Coffee,
  'demo-adaptive-cards': LayoutTemplate,
  'demo-wiring': Zap,
  'demo-studio-guide': Bot,
  'demo-media-assets': Film,
  'demo-animations': Sparkles,
  'showcase-coffee': Coffee,
  'showcase-clothing': BarChart3,
  'showcase-insurance': FileCheck,
  'showcase-it-helpdesk': Headphones,
  'showcase-seller': Users,
  'showcase-fleet': Truck,
  'showcase-fuel': Fuel,
  'showcase-dayour-protocol': Sparkles,
  cowork: Users,
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

function AutomationBadge() {
  const isActive = useBrowserActionStore((s) => s.isAutomationActive);
  const activeCount = useBrowserActionStore((s) =>
    s.actions.filter((a) => a.status === 'running' || a.status === 'pending').length
  );

  if (!isActive) return null;

  return (
    <span className="ml-1 flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      {activeCount > 0 && (
        <span className="text-[10px] text-blue-400 font-medium">{activeCount}</span>
      )}
    </span>
  );
}

interface TabItemProps {
  tab: Tab;
  isVertical: boolean;
  isFaviconAvailable: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onFaviconError: (id: string) => void;
}

const TabItem = React.memo(
  function TabItem({
    tab,
    isVertical,
    isFaviconAvailable,
    onActivate,
    onClose,
    onContextMenu,
    onFaviconError,
  }: TabItemProps) {
    const containerClassName = isVertical
      ? `group flex h-[36px] w-full items-center gap-2 rounded-md px-2 transition-colors ${
          tab.isActive
            ? 'bg-[var(--color-tab-active)] text-[var(--color-text-primary)]'
            : 'bg-[var(--color-tab-inactive)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]'
        }`
      : `group flex h-7 shrink-0 items-center rounded-md transition-colors ${
          tab.isPinned ? 'w-9 justify-center px-0' : 'max-w-[220px] gap-1 pl-2 pr-1'
        } ${
          tab.isActive
            ? 'bg-[var(--color-tab-active)] text-[var(--color-text-primary)]'
            : 'bg-[var(--color-tab-inactive)] text-[var(--color-text-secondary)] hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]'
        }`;

    const tabButtonClassName = isVertical
      ? 'flex min-w-0 flex-1 items-center gap-2 text-left outline-none'
      : tab.isPinned
        ? 'flex h-full w-full items-center justify-center outline-none'
        : 'flex min-w-0 flex-1 items-center gap-2 text-left outline-none';

    return (
      <div
        key={tab.id}
        className={containerClassName}
        onContextMenu={(event) => onContextMenu(event, tab.id)}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab.isActive}
          onClick={() => onActivate(tab.id)}
          className={tabButtonClassName}
          title={isVertical ? undefined : tab.title}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {isFaviconAvailable ? (
              <img
                src={tab.favicon}
                alt=""
                className="h-4 w-4"
                onError={() => onFaviconError(tab.id)}
              />
            ) : (
              <TypeIcon type={tab.type} />
            )}
          </span>

          {isVertical ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm">{tab.title}</span>
              {tab.type === 'browser' && <AutomationBadge />}
            </>
          ) : (
            !tab.isPinned && (
              <>
                <span className="max-w-[150px] truncate text-xs">{tab.title}</span>
                {tab.type === 'browser' && <AutomationBadge />}
              </>
            )
          )}
        </button>

        {!tab.isPinned && (
          <button
            type="button"
            onClick={() => {
              onClose(tab.id);
            }}
            className={
              isVertical
                ? 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                : 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
            }
            aria-label={`Close ${tab.title}`}
            title={isVertical ? 'Close tab' : undefined}
          >
            <X size={isVertical ? 14 : 12} />
          </button>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.isVertical === nextProps.isVertical &&
    prevProps.isFaviconAvailable === nextProps.isFaviconAvailable &&
    prevProps.onActivate === nextProps.onActivate &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onContextMenu === nextProps.onContextMenu &&
    prevProps.onFaviconError === nextProps.onFaviconError &&
    prevProps.tab?.id === nextProps.tab?.id &&
    prevProps.tab?.title === nextProps.tab?.title &&
    prevProps.tab?.isActive === nextProps.tab?.isActive &&
    prevProps.tab?.isPinned === nextProps.tab?.isPinned &&
    prevProps.tab?.favicon === nextProps.tab?.favicon &&
    prevProps.tab?.type === nextProps.tab?.type,
);

export function TabBar({ vertical }: { vertical?: boolean }) {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const verticalTabsEnabled = useAppStore((state) => state.verticalTabsEnabled);
  const openSettingsPanel = useAppStore((state) => state.openSettingsPanel);
  const isVertical = vertical ?? verticalTabsEnabled;

  const [brokenFavicons, setBrokenFavicons] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);

  const handleFaviconError = useCallback((tabId: string) => {
    setBrokenFavicons((prev) => {
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
  }, []);

  const handleActivate = useCallback((id: string) => setActiveTab(id), [setActiveTab]);
  const handleClose = useCallback((id: string) => closeTab(id), [closeTab]);
  const handleContextMenu = useCallback((event: React.MouseEvent, id: string) => {
    event.preventDefault();
    setContextMenu({ tabId: id, x: event.clientX, y: event.clientY });
  }, []);

  if (isVertical) {
    return (
      <>
        <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
        <div className="flex h-[36px] items-center justify-end border-b border-[var(--color-border-default)] px-2">
          <button
            type="button"
            onClick={openSettingsPanel}
            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="Open settings"
            title="Settings"
          >
            <Settings2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => addTab('terminal')}
            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="New terminal tab"
            title="New terminal tab (Ctrl+`)"
          >
            <Terminal size={16} />
          </button>
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
          <div className="flex flex-col gap-1" role="tablist" aria-orientation="vertical">
            {tabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                isVertical={isVertical}
                isFaviconAvailable={Boolean(tab.favicon) && !brokenFavicons.has(tab.id)}
                onActivate={handleActivate}
                onClose={handleClose}
                onContextMenu={handleContextMenu}
                onFaviconError={handleFaviconError}
              />
            ))}
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
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1" role="tablist" aria-orientation="horizontal">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isVertical={isVertical}
              isFaviconAvailable={Boolean(tab.favicon) && !brokenFavicons.has(tab.id)}
              onActivate={handleActivate}
              onClose={handleClose}
              onContextMenu={handleContextMenu}
              onFaviconError={handleFaviconError}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={openSettingsPanel}
          className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
          aria-label="Open settings"
          title="Settings"
        >
          <Settings2 size={16} />
        </button>

        <button
          type="button"
          onClick={() => addTab('terminal')}
          className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tab-hover)] hover:text-[var(--color-text-primary)]"
          aria-label="New terminal tab"
          title="New terminal tab (Ctrl+`)"
        >
          <Terminal size={16} />
        </button>

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

