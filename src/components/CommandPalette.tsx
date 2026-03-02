// ---------------------------------------------------------------------------
// CommandPalette.tsx -- VS Code / Edge-style command palette for CopilotHub
// Opens with Ctrl+Shift+P. Provides fuzzy-filtered commands for tabs, view
// toggles, theme switching, and sidecar management.
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { useTabStore } from '../store/tabStore';
import { logger } from '../lib/logger';
import {
  Search,
  Plus,
  Terminal,
  Code,
  MessageSquare,
  X,
  PanelLeft,
  Sidebar,
  Sun,
  Moon,
  Monitor,
  Building2,
  Play,
  Square,
  BookOpen,
  Calendar,
  Wrench,
  Coffee,
  Zap,
  Bot,
  LayoutTemplate,
  Film,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);
  const setTheme = useAppStore((s) => s.setTheme);
  const toggleVerticalTabs = useAppStore((s) => s.toggleVerticalTabs);
  const toggleCopilotSidebar = useAppStore((s) => s.toggleCopilotSidebar);

  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const tabs = useTabStore((s) => s.tabs);
  const activeTab = useTabStore((s) => s.activeTab());
  const closeTab = useTabStore((s) => s.closeTab);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Command registry
  // -----------------------------------------------------------------------

  const commands: Command[] = useMemo(() => {
    const close = () => toggleCommandPalette();

    return [
      // -- Tabs ------------------------------------------------------------
      {
        id: 'new-browser-tab',
        label: 'New Browser Tab',
        category: 'Tabs',
        shortcut: 'Ctrl+T',
        icon: <Plus size={16} />,
        action: () => { addTab('browser'); close(); },
      },
      {
        id: 'new-terminal-tab',
        label: 'New Terminal Tab',
        category: 'Tabs',
        icon: <Terminal size={16} />,
        action: () => { addTab('terminal'); close(); },
      },
      {
        id: 'new-vscode-tab',
        label: 'New VS Code Tab',
        category: 'Tabs',
        icon: <Code size={16} />,
        action: () => { addTab('vscode'); close(); },
      },
      {
        id: 'open-chat',
        label: 'Open Chat',
        category: 'Tabs',
        icon: <MessageSquare size={16} />,
        action: () => {
          const chatTab = tabs.find((t) => t.type === 'chat');
          if (chatTab) {
            setActiveTab(chatTab.id);
          } else {
            addTab('chat');
          }
          close();
        },
      },
      {
        id: 'open-runbook-marketplace',
        label: 'Open Runbook Marketplace',
        category: 'Tabs',
        icon: <BookOpen size={16} />,
        action: () => { addTab('runbook'); close(); },
      },
      {
        id: 'open-calendar-demo',
        label: 'Demo: Calendar App',
        category: 'Demos',
        icon: <Calendar size={16} />,
        action: () => { addTab('demo-calendar'); close(); },
      },
      {
        id: 'open-mechanic-demo',
        label: 'Demo: Mechanic Shop',
        category: 'Demos',
        icon: <Wrench size={16} />,
        action: () => { addTab('demo-mechanic'); close(); },
      },
      {
        id: 'open-coffeeshop-demo',
        label: 'Demo: Coffee Shop POS',
        category: 'Demos',
        icon: <Coffee size={16} />,
        action: () => { addTab('demo-coffeeshop'); close(); },
      },
      {
        id: 'open-wiring-demo',
        label: 'Demo: Wiring Diagram',
        category: 'Demos',
        icon: <Zap size={16} />,
        action: () => { addTab('demo-wiring'); close(); },
      },
      {
        id: 'open-studio-guide-demo',
        label: 'Demo: Copilot Studio Guide',
        category: 'Demos',
        icon: <Bot size={16} />,
        action: () => { addTab('demo-studio-guide'); close(); },
      },
      {
        id: 'open-adaptive-cards-demo',
        label: 'Demo: Adaptive Card Builder',
        category: 'Demos',
        icon: <LayoutTemplate size={16} />,
        action: () => { addTab('demo-adaptive-cards'); close(); },
      },
      {
        id: 'open-media-assets-demo',
        label: 'Demo: Media Asset Studio',
        category: 'Demos',
        icon: <Film size={16} />,
        action: () => { addTab('demo-media-assets'); close(); },
      },
      {
        id: 'open-animations-demo',
        label: 'Demo: Animation Studio',
        category: 'Demos',
        icon: <Sparkles size={16} />,
        action: () => { addTab('demo-animations'); close(); },
      },
      {
        id: 'close-current-tab',
        label: 'Close Current Tab',
        category: 'Tabs',
        shortcut: 'Ctrl+W',
        icon: <X size={16} />,
        action: () => {
          if (activeTab) {
            closeTab(activeTab.id);
          }
          close();
        },
      },

      // -- View ------------------------------------------------------------
      {
        id: 'toggle-vertical-tabs',
        label: 'Toggle Vertical Tabs',
        category: 'View',
        shortcut: 'Ctrl+Shift+E',
        icon: <PanelLeft size={16} />,
        action: () => { toggleVerticalTabs(); close(); },
      },
      {
        id: 'toggle-copilot-sidebar',
        label: 'Toggle Copilot Sidebar',
        category: 'View',
        icon: <Sidebar size={16} />,
        action: () => { toggleCopilotSidebar(); close(); },
      },

      // -- Theme -----------------------------------------------------------
      {
        id: 'theme-dark',
        label: 'Theme: Edge Dark',
        category: 'Theme',
        icon: <Moon size={16} />,
        action: () => { setTheme('dark'); close(); },
      },
      {
        id: 'theme-light',
        label: 'Theme: Edge Light',
        category: 'Theme',
        icon: <Sun size={16} />,
        action: () => { setTheme('light'); close(); },
      },
      {
        id: 'theme-enterprise-blue',
        label: 'Theme: Enterprise Blue',
        category: 'Theme',
        icon: <Building2 size={16} />,
        action: () => { setTheme('enterprise-blue'); close(); },
      },
      {
        id: 'theme-system',
        label: 'Theme: System',
        category: 'Theme',
        icon: <Monitor size={16} />,
        action: () => { setTheme('system'); close(); },
      },

      // -- Agent -----------------------------------------------------------
      {
        id: 'start-sidecar',
        label: 'Start Sidecar',
        category: 'Agent',
        icon: <Play size={16} />,
        action: () => {
          invoke('start_sidecar').catch((err: unknown) => {
            logger.error('palette', 'Failed to start sidecar', err);
          });
          close();
        },
      },
      {
        id: 'stop-sidecar',
        label: 'Stop Sidecar',
        category: 'Agent',
        icon: <Square size={16} />,
        action: () => {
          invoke('stop_sidecar').catch((err: unknown) => {
            logger.error('palette', 'Failed to stop sidecar', err);
          });
          close();
        },
      },
    ];
  }, [
    addTab,
    activeTab,
    closeTab,
    setActiveTab,
    setTheme,
    tabs,
    toggleCommandPalette,
    toggleCopilotSidebar,
    toggleVerticalTabs,
  ]);

  // -----------------------------------------------------------------------
  // Filtered results (simple includes-based fuzzy match)
  // -----------------------------------------------------------------------

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(lower));
  }, [commands, query]);

  // -----------------------------------------------------------------------
  // Group filtered results by category for display
  // -----------------------------------------------------------------------

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const group = map.get(cmd.category) ?? [];
      group.push(cmd);
      map.set(cmd.category, group);
    }
    return map;
  }, [filtered]);

  // -----------------------------------------------------------------------
  // Reset state when palette opens / closes
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus the input after a tick so the DOM is mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [commandPaletteOpen]);

  // Clamp selected index when results change
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev <= 0 ? Math.max(filtered.length - 1, 0) : prev - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            filtered[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          toggleCommandPalette();
          break;
        default:
          break;
      }
    },
    [filtered, selectedIndex, toggleCommandPalette],
  );

  // -----------------------------------------------------------------------
  // Scroll selected item into view
  // -----------------------------------------------------------------------

  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.querySelector<HTMLElement>('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!commandPaletteOpen) return null;

  // Build a flat index counter so we can map grouped display to flat selectedIndex
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={toggleCommandPalette}
        aria-hidden="true"
      />

      {/* Palette container */}
      <div
        className="fixed z-50 left-1/2 -translate-x-1/2 w-[600px] bg-surface-secondary border border-default rounded-lg shadow-2xl"
        style={{ top: '20%' }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-default px-3">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command..."
            className="w-full bg-surface-primary text-text-primary p-3 outline-none placeholder:text-text-muted"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-text-muted text-sm">
              No matching commands
            </div>
          )}

          {Array.from(grouped.entries()).map(([category, cmds]) => (
            <div key={category}>
              {/* Category header */}
              <div className="text-xs uppercase text-text-muted px-3 py-2 select-none font-medium tracking-wide">
                {category}
              </div>

              {/* Commands in this category */}
              {cmds.map((cmd) => {
                const currentFlatIndex = flatIndex;
                flatIndex += 1;
                const isSelected = currentFlatIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-selected={isSelected}
                    className={
                      'flex items-center w-full px-3 py-2 gap-3 text-left text-sm transition-colors cursor-pointer ' +
                      (isSelected
                        ? 'bg-accent-primary/20 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-hover')
                    }
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                  >
                    {/* Icon */}
                    <span className="flex-shrink-0 text-text-muted">{cmd.icon}</span>

                    {/* Label */}
                    <span className="flex-1 truncate">{cmd.label}</span>

                    {/* Keyboard shortcut badge */}
                    {cmd.shortcut && (
                      <span className="flex-shrink-0 text-xs bg-surface-tertiary text-text-muted px-1.5 py-0.5 rounded font-mono">
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
