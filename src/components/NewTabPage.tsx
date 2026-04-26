import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Calendar,
  Code,
  Coffee,
  Film,
  FileCheck,
  FolderKanban,
  Fuel,
  Headphones,
  Layers3,
  LayoutTemplate,
  MessageSquare,
  Search,
  Sparkles,
  Terminal,
  Truck,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useTabStore } from '../store/tabStore';
import { APP_CONFIG } from '../lib/config';

const URL_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

type LauncherCard = {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
};

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (URL_PROTOCOL_REGEX.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function describeWorkspace(projectPath: string | null): string {
  if (!projectPath) {
    return 'No project selected';
  }

  const segments = projectPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? projectPath;
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {eyebrow}
      </span>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="max-w-3xl text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function LauncherGrid({
  cards,
  columns,
}: {
  cards: LauncherCard[];
  columns: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${columns}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        const descriptionId = `launcher-${card.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        return (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            aria-label={card.label}
            aria-describedby={descriptionId}
            className="group flex min-h-[124px] flex-col items-start gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-4 text-left transition-all hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{card.label}</div>
              <p id={descriptionId} className="text-sm leading-5 text-[var(--color-text-secondary)]">
                {card.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function NewTabPage({ tabId }: { tabId: string }) {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const updateTabUrl = useTabStore((state) => state.updateTabUrl);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);

  const [inputValue, setInputValue] = useState('');

  const chatTabId = useMemo(
    () => tabs.find((tab) => tab.type === 'chat')?.id,
    [tabs],
  );
  const workspaceLabel = useMemo(
    () => describeWorkspace(currentProjectPath),
    [currentProjectPath],
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

  const coreWorkspaceCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Open Chat',
        description: 'Jump back into Copilot threads and action-mode conversations.',
        icon: MessageSquare,
        onClick: handleOpenChat,
      },
      {
        label: 'New Terminal',
        description: 'Launch a shell surface for local commands, scripts, and automation.',
        icon: Terminal,
        onClick: () => addTab('terminal'),
      },
      {
        label: 'VS Code',
        description: 'Open the code workbench and inspect the local extension bridge.',
        icon: Code,
        onClick: () => addTab('vscode'),
      },
      {
        label: 'Runbooks',
        description: 'Create or run YAML automation sequences from the shared marketplace.',
        icon: BookOpen,
        onClick: () => addTab('runbook'),
      },
    ],
    [addTab, handleOpenChat],
  );

  const makerCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Copilot Studio',
        description: 'Open the maker surface for custom agents and orchestration design.',
        icon: Bot,
        onClick: () => addTab('copilot-studio'),
      },
      {
        label: 'CoWork',
        description: 'Track plan-checkpoint-approve-execute tasks in a dedicated operator view.',
        icon: BrainCircuit,
        onClick: () => addTab('cowork'),
      },
      {
        label: 'Power Platform',
        description: 'Reach the Power Apps and Power Automate maker surfaces from CopilotHub.',
        icon: Layers3,
        onClick: () => addTab('power-platform'),
      },
    ],
    [addTab],
  );

  const demoCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Calendar App',
        description: 'Review scheduling and availability experiences in a polished sample app.',
        icon: Calendar,
        onClick: () => addTab('demo-calendar'),
      },
      {
        label: 'Mechanic Shop',
        description: 'Explore an operations-focused service workflow demo.',
        icon: Wrench,
        onClick: () => addTab('demo-mechanic'),
      },
      {
        label: 'Coffee Shop POS',
        description: 'Inspect a compact retail workflow and cashier-style interaction model.',
        icon: Coffee,
        onClick: () => addTab('demo-coffeeshop'),
      },
      {
        label: 'Wiring Diagram',
        description: 'Open the engineering-style visual diagram experience.',
        icon: Zap,
        onClick: () => addTab('demo-wiring'),
      },
      {
        label: 'Studio Guide',
        description: 'Walk through Copilot Studio guidance content inside a dedicated tab.',
        icon: Bot,
        onClick: () => addTab('demo-studio-guide'),
      },
      {
        label: 'Adaptive Cards',
        description: 'Prototype card layouts and content composition patterns.',
        icon: LayoutTemplate,
        onClick: () => addTab('demo-adaptive-cards'),
      },
      {
        label: 'Media Assets',
        description: 'Review content-management and asset-staging workflows.',
        icon: Film,
        onClick: () => addTab('demo-media-assets'),
      },
      {
        label: 'Animations',
        description: 'Preview motion-heavy experiences and interaction polish concepts.',
        icon: Sparkles,
        onClick: () => addTab('demo-animations'),
      },
    ],
    [addTab],
  );

  const showcaseCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Coffee Coach',
        description: 'Customer-engagement showcase for coaching and next-best-action guidance.',
        icon: Coffee,
        onClick: () => addTab('showcase-coffee'),
      },
      {
        label: 'Power Analysis',
        description: 'Retail power and trend analysis assistant for merchandising scenarios.',
        icon: BarChart3,
        onClick: () => addTab('showcase-clothing'),
      },
      {
        label: 'Claims Assistant',
        description: 'Insurance intake and claim-handling showcase with guided workflows.',
        icon: FileCheck,
        onClick: () => addTab('showcase-insurance'),
      },
      {
        label: 'IT Help Desk',
        description: 'Internal support experience for troubleshooting and escalation flows.',
        icon: Headphones,
        onClick: () => addTab('showcase-it-helpdesk'),
      },
      {
        label: 'Seller Prospect',
        description: 'Seller-assist showcase for pipeline preparation and account research.',
        icon: Users,
        onClick: () => addTab('showcase-seller'),
      },
      {
        label: 'Fleet Coordinator',
        description: 'Operations showcase for dispatching, schedules, and field coordination.',
        icon: Truck,
        onClick: () => addTab('showcase-fleet'),
      },
      {
        label: 'Fuel Tracking',
        description: 'Fleet analytics showcase focused on utilization and fuel operations.',
        icon: Fuel,
        onClick: () => addTab('showcase-fuel'),
      },
    ],
    [addTab],
  );

  return (
    <div className="flex h-full w-full justify-center overflow-y-auto bg-[var(--color-surface-primary)] px-6 py-8">
      <div className="flex w-full max-w-[1120px] flex-col gap-8">
        <section className="rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]/60 p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                <FolderKanban className="h-3.5 w-3.5" />
                Organized launch surface
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {APP_CONFIG.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  Start with a browser, jump into chat, or launch maker and demo surfaces from one organized workspace
                  hub.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]">
                  <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1">
                    Ctrl+T Browser
                  </span>
                  <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1">
                    Ctrl+` Terminal
                  </span>
                  <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1">
                    Ctrl+Shift+P Palette
                  </span>
                  <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-1">
                    Ctrl+Shift+E Tabs
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Project
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{workspaceLabel}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Open tabs
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{tabs.length}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Chat
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
                  {chatTabId ? 'Ready' : 'Launchable'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 relative w-full">
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
              placeholder="Enter a URL to browse"
              className="h-14 w-full rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] pl-12 pr-4 text-base text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-focus)]"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label="New tab address input"
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Core workspace"
            title="Jump into the primary operator surfaces"
            description="These are the fastest ways to move from the launcher into chat, coding, terminal work, and reusable automation."
          />
          <LauncherGrid cards={coreWorkspaceCards} columns="sm:grid-cols-2 xl:grid-cols-4" />
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Maker and operations"
            title="Open collaboration and maker surfaces"
            description="Keep agent design, operator workflows, and Power Platform tools grouped together instead of mixing them with demos."
          />
          <LauncherGrid cards={makerCards} columns="sm:grid-cols-2 xl:grid-cols-3" />
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Demos"
            title="Browse polished sample experiences"
            description="Explore product-style demo tabs without crowding the core operational launchers."
          />
          <LauncherGrid cards={demoCards} columns="sm:grid-cols-2 xl:grid-cols-4" />
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Agent showcases"
            title="Launch role-based showcase experiences"
            description="Industry scenarios are grouped here so the main launcher stays readable while every showcase remains one click away."
          />
          <LauncherGrid cards={showcaseCards} columns="sm:grid-cols-2 xl:grid-cols-4" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-5 py-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Getting Started</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>Press Ctrl+Shift+P for Command Palette</li>
            <li>Press Ctrl+T for a new browser tab</li>
            <li>Press Ctrl+` to open or focus the terminal</li>
            <li>Press Ctrl+Shift+E to toggle vertical tabs</li>
            <li>Type @browser in Action mode to control the browser</li>
            <li>Create runbooks in YAML to automate workflows</li>
          </ul>
        </section>

        <footer className="pb-2 text-xs text-[var(--color-text-secondary)]">
          {APP_CONFIG.name} v{APP_CONFIG.version} -- {APP_CONFIG.description}
        </footer>
      </div>
    </div>
  );
}
