import { useEffect, useRef } from 'react';
import { useTabStore } from '../store/tabStore';

type TabContextMenuProps = {
  tabId: string;
  position: { x: number; y: number };
  onClose: () => void;
};

function Separator() {
  return <div className="my-1 h-px w-full bg-[var(--color-border-subtle)]" role="separator" />;
}

export function TabContextMenu({ tabId, position, onClose }: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabs = useTabStore((state) => state.tabs);
  const closeTab = useTabStore((state) => state.closeTab);
  const closeOtherTabs = useTabStore((state) => state.closeOtherTabs);
  const closeTabsToRight = useTabStore((state) => state.closeTabsToRight);
  const duplicateTab = useTabStore((state) => state.duplicateTab);
  const pinTab = useTabStore((state) => state.pinTab);
  const unpinTab = useTabStore((state) => state.unpinTab);
  const addTab = useTabStore((state) => state.addTab);

  const tab = tabs.find((currentTab) => currentTab.id === tabId);
  const isPinned = Boolean(tab?.isPinned);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const withClose = (action: () => void) => () => {
    action();
    onClose();
  };

  const firstGroup = [
    { label: 'Close Tab', onClick: withClose(() => closeTab(tabId)) },
    { label: 'Close Other Tabs', onClick: withClose(() => closeOtherTabs(tabId)) },
    { label: 'Close Tabs to Right', onClick: withClose(() => closeTabsToRight(tabId)) },
  ];

  const secondGroup = [
    { label: 'Duplicate Tab', onClick: withClose(() => duplicateTab(tabId)) },
    {
      label: isPinned ? 'Unpin Tab' : 'Pin Tab',
      onClick: withClose(() => (isPinned ? unpinTab(tabId) : pinTab(tabId))),
    },
  ];

  const thirdGroup = [
    { label: 'New Browser Tab', onClick: withClose(() => addTab('browser')) },
    { label: 'New Terminal Tab', onClick: withClose(() => addTab('terminal')) },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] py-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Tab context menu"
    >
      {firstGroup.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          role="menuitem"
        >
          {item.label}
        </button>
      ))}

      <Separator />

      {secondGroup.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          role="menuitem"
        >
          {item.label}
        </button>
      ))}

      <Separator />

      {thirdGroup.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center px-3 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          role="menuitem"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default TabContextMenu;
