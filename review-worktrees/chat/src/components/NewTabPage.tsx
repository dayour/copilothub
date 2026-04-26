import { useMemo, useState } from 'react';
import { Search, MessageSquare, Terminal, Code, BookOpen, Calendar, Wrench, Coffee, Zap, Bot, LayoutTemplate, Film, Sparkles, BarChart3, FileCheck, Headphones, Users, Truck, Fuel, Layers3 } from 'lucide-react';
import { useTabStore } from '../store/tabStore';
import { APP_CONFIG } from '../lib/config';

const URL_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (URL_PROTOCOL_REGEX.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function NewTabPage({ tabId }: { tabId: string }) {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const updateTabUrl = useTabStore((state) => state.updateTabUrl);

  const [inputValue, setInputValue] = useState('');

  const chatTabId = useMemo(
    () => tabs.find((tab) => tab.type === 'chat')?.id,
    [tabs],
  );

  const handleNavigate = () => {
    const nextUrl = normalizeUrl(inputValue);
    if (!nextUrl) return;
    updateTabUrl(tabId, nextUrl);
  };

  const handleOpenChat = () => {
    if (chatTabId) {
      setActiveTab(chatTabId);
      return;
    }
    addTab('chat');
  };

  return (
    <div className="flex h-full w-full items-start justify-center overflow-y-auto bg-[var(--color-surface-primary)] px-6 pt-12 pb-6">
      <div className="flex w-full max-w-[900px] flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {APP_CONFIG.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Your enterprise agentic workspace
          </p>
        </div>

        <div className="relative w-full max-w-[600px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleNavigate();
              }
            }}
            placeholder="Search or enter URL"
            className="h-12 w-full rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] pl-12 pr-4 text-lg text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="New tab address input"
          />
        </div>

        <div className="mt-6 grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={handleOpenChat}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Open Chat</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('terminal')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Terminal className="h-4 w-4" />
            <span>New Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('vscode')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Code className="h-4 w-4" />
            <span>VS Code</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('runbook')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <BookOpen className="h-4 w-4" />
            <span>Runbooks</span>
          </button>
        </div>

        <div className="mt-4 grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => addTab('copilot-studio')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Bot className="h-4 w-4" />
            <span>Copilot Studio</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('power-platform')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Layers3 className="h-4 w-4" />
            <span>Power Platform</span>
          </button>
        </div>

        <div className="mt-4 grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => addTab('demo-calendar')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar App</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-mechanic')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Wrench className="h-4 w-4" />
            <span>Mechanic Shop</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-coffeeshop')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Coffee className="h-4 w-4" />
            <span>Coffee Shop POS</span>
          </button>
        </div>

        <div className="mt-3 grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => addTab('demo-wiring')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Zap className="h-4 w-4" />
            <span>Wiring Diagram</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-studio-guide')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Bot className="h-4 w-4" />
            <span>Studio Guide</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-adaptive-cards')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>Adaptive Cards</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-media-assets')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Film className="h-4 w-4" />
            <span>Media Assets</span>
          </button>

          <button
            type="button"
            onClick={() => addTab('demo-animations')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Animations</span>
          </button>
        </div>

        <div className="mt-6 w-full max-w-[760px]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Agent Showcases</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => addTab('showcase-coffee')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Coffee className="h-4 w-4" /><span>Coffee Coach</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-clothing')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <BarChart3 className="h-4 w-4" /><span>Power Analysis</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-insurance')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <FileCheck className="h-4 w-4" /><span>Claims Assistant</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-it-helpdesk')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Headphones className="h-4 w-4" /><span>IT Help Desk</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-seller')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Users className="h-4 w-4" /><span>Seller Prospect</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-fleet')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Truck className="h-4 w-4" /><span>Fleet Coordinator</span>
            </button>
            <button type="button" onClick={() => addTab('showcase-fuel')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]">
              <Fuel className="h-4 w-4" /><span>Fuel Tracking</span>
            </button>
          </div>
        </div>

        <section className="mt-6 w-full max-w-[760px] rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Getting Started</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>Press Ctrl+Shift+P for Command Palette</li>
            <li>Press Ctrl+T for a new browser tab</li>
            <li>Type @browser in Action mode to control the browser</li>
            <li>Create runbooks in YAML to automate workflows</li>
          </ul>
        </section>

        <footer className="mt-6 mb-4 text-xs text-[var(--color-text-secondary)]">
          {APP_CONFIG.name} v{APP_CONFIG.version} -- {APP_CONFIG.description}
        </footer>
      </div>
    </div>
  );
}

