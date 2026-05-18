import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Calendar,
  Code,
  Coffee,
  Command,
  FileCheck,
  Film,
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
import { useTabStore, type TabType } from '../store/tabStore';
import { APP_CONFIG } from '../lib/config';

const URL_PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LauncherCard = {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: string;
  accent?: boolean;
};

type GalleryEntry = {
  label: string;
  category: 'Demo' | 'Showcase';
  icon: LucideIcon;
  tabType: TabType;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (URL_PROTOCOL_REGEX.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function describeWorkspace(projectPath: string | null): string {
  if (!projectPath) return 'No project selected';
  const segments = projectPath.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? projectPath;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          {eyebrow}
        </span>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {description && (
          <p className="max-w-3xl text-[13px] leading-5 text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function FeaturedCard({ card }: { card: LauncherCard }) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      onClick={card.onClick}
      aria-label={card.label}
      className={`group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-150 ${
        card.accent
          ? 'border-[var(--color-accent-primary)]/50 bg-gradient-to-br from-[var(--color-accent-primary)]/15 via-[var(--color-surface-elevated)] to-[var(--color-surface-elevated)] hover:border-[var(--color-accent-primary)] hover:from-[var(--color-accent-primary)]/25'
          : 'border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            card.accent
              ? 'bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-hover)]'
              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {card.badge && (
          <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            {card.badge}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
          {card.label}
          <ArrowRight className="h-3.5 w-3.5 translate-x-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
        </div>
        <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
          {card.description}
        </p>
      </div>
    </button>
  );
}

function GalleryTile({ entry, onClick }: { entry: GalleryEntry; onClick: () => void }) {
  const Icon = entry.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={entry.label}
      className="group flex h-full flex-col items-start gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/70 px-3 py-3 text-left transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-hover)]">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {entry.category}
        </span>
      </div>
      <span className="text-[13px] font-medium leading-tight text-[var(--color-text-primary)]">
        {entry.label}
      </span>
    </button>
  );
}

function StatPill({
  eyebrow,
  value,
  status,
}: {
  eyebrow: string;
  value: string;
  status?: 'ready' | 'idle' | 'warning';
}) {
  const dotColor =
    status === 'ready'
      ? 'bg-[var(--color-status-success)]'
      : status === 'warning'
      ? 'bg-[var(--color-status-warning)]'
      : 'bg-[var(--color-text-muted)]';
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]/70 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {status && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden />}
        {eyebrow}
      </div>
      <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function ShortcutChip({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]/80 px-2 py-1 text-[11px] text-[var(--color-text-secondary)]">
      <kbd className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-primary)]">
        {keys}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NewTabPage({ tabId }: { tabId: string }) {
  const tabs = useTabStore((state) => state.tabs);
  const addTab = useTabStore((state) => state.addTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const updateTabUrl = useTabStore((state) => state.updateTabUrl);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);

  const [inputValue, setInputValue] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'Demo' | 'Showcase'>('all');

  const chatTabId = useMemo(() => tabs.find((tab) => tab.type === 'chat')?.id, [tabs]);
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

  // -------------------------------------------------------------------------
  // Card data
  // -------------------------------------------------------------------------

  const primaryCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Open Chat',
        description: 'Resume Copilot threads or start a new action-mode conversation.',
        icon: MessageSquare,
        onClick: handleOpenChat,
        accent: true,
        badge: chatTabId ? 'Active' : 'New',
      },
      {
        label: 'Terminal',
        description: 'Launch a shell for local commands, scripts, and automation.',
        icon: Terminal,
        onClick: () => addTab('terminal'),
      },
      {
        label: 'VS Code',
        description: 'Open the code workbench with the local extension bridge.',
        icon: Code,
        onClick: () => addTab('vscode'),
      },
      {
        label: 'Runbooks',
        description: 'Browse the YAML automation marketplace and run sequences.',
        icon: BookOpen,
        onClick: () => addTab('runbook'),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpenChat is stable enough
    [addTab, chatTabId],
  );

  const buildCards = useMemo<LauncherCard[]>(
    () => [
      {
        label: 'Copilot Studio',
        description: 'Design custom agents, topics, and orchestration flows.',
        icon: Bot,
        onClick: () => addTab('copilot-studio'),
      },
      {
        label: 'CoWork Operator',
        description: 'Plan, checkpoint, approve, and execute long-running agent work.',
        icon: BrainCircuit,
        onClick: () => addTab('cowork'),
      },
      {
        label: 'Power Platform',
        description: 'Open Power Apps and Power Automate maker surfaces.',
        icon: Layers3,
        onClick: () => addTab('power-platform'),
      },
    ],
    [addTab],
  );

  const galleryEntries = useMemo<GalleryEntry[]>(
    () => [
      { label: 'Calendar App', category: 'Demo', icon: Calendar, tabType: 'demo-calendar' },
      { label: 'Mechanic Shop', category: 'Demo', icon: Wrench, tabType: 'demo-mechanic' },
      { label: 'Coffee Shop POS', category: 'Demo', icon: Coffee, tabType: 'demo-coffeeshop' },
      { label: 'Wiring Diagram', category: 'Demo', icon: Zap, tabType: 'demo-wiring' },
      { label: 'Studio Guide', category: 'Demo', icon: Bot, tabType: 'demo-studio-guide' },
      { label: 'Adaptive Cards', category: 'Demo', icon: LayoutTemplate, tabType: 'demo-adaptive-cards' },
      { label: 'Media Assets', category: 'Demo', icon: Film, tabType: 'demo-media-assets' },
      { label: 'Animations', category: 'Demo', icon: Sparkles, tabType: 'demo-animations' },
      { label: 'Coffee Coach', category: 'Showcase', icon: Coffee, tabType: 'showcase-coffee' },
      { label: 'Power Analysis', category: 'Showcase', icon: BarChart3, tabType: 'showcase-clothing' },
      { label: 'Claims Assistant', category: 'Showcase', icon: FileCheck, tabType: 'showcase-insurance' },
      { label: 'IT Help Desk', category: 'Showcase', icon: Headphones, tabType: 'showcase-it-helpdesk' },
      { label: 'Seller Prospect', category: 'Showcase', icon: Users, tabType: 'showcase-seller' },
      { label: 'Fleet Coordinator', category: 'Showcase', icon: Truck, tabType: 'showcase-fleet' },
      { label: 'Fuel Tracking', category: 'Showcase', icon: Fuel, tabType: 'showcase-fuel' },
    ],
    [],
  );

  const filteredGallery = useMemo(
    () =>
      galleryFilter === 'all'
        ? galleryEntries
        : galleryEntries.filter((e) => e.category === galleryFilter),
    [galleryEntries, galleryFilter],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full w-full justify-center overflow-y-auto bg-[var(--color-surface-primary)]">
      <div className="flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8">
        {/* Hero ------------------------------------------------------------ */}
        <section
          className="relative overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-7 py-7"
          style={{
            backgroundImage:
              'radial-gradient(circle at 0% 0%, rgba(0,120,212,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(43,136,216,0.12), transparent 60%)',
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-accent-primary)]/40 bg-[var(--color-accent-primary)]/15 px-3 py-1 text-[11px] font-medium text-[var(--color-accent-hover)]">
                <Sparkles className="h-3.5 w-3.5" />
                Central agent hub
              </div>
              <div className="flex items-center gap-3">
                <img
                  src="/copilot-hub-mark-glow.svg"
                  alt="CopilotHub"
                  draggable={false}
                  className="h-14 w-14 shrink-0 drop-shadow-[0_0_24px_rgba(56,200,255,0.25)]"
                />
                <div>
                  <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text-primary)]">
                    {APP_CONFIG.name}
                  </h1>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    Browse, build, and orchestrate every agent surface from one workspace.
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-1 grid grid-cols-3 gap-2 lg:max-w-md">
                <StatPill
                  eyebrow="Project"
                  value={workspaceLabel}
                  status={currentProjectPath ? 'ready' : 'idle'}
                />
                <StatPill eyebrow="Open tabs" value={String(tabs.length)} status="ready" />
                <StatPill
                  eyebrow="Chat"
                  value={chatTabId ? 'Connected' : 'Standby'}
                  status={chatTabId ? 'ready' : 'idle'}
                />
              </div>
            </div>

            {/* Shortcut chips */}
            <div className="flex flex-wrap gap-1.5 lg:max-w-[280px] lg:justify-end">
              <ShortcutChip keys="Ctrl+T" label="New tab" />
              <ShortcutChip keys="Ctrl+`" label="Terminal" />
              <ShortcutChip keys="Ctrl+Shift+P" label="Palette" />
              <ShortcutChip keys="Ctrl+Shift+E" label="Vertical tabs" />
              <ShortcutChip keys="@browser" label="Action mode" />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-6 w-full">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]"
              aria-hidden
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
              placeholder="Enter a URL or search the web..."
              className="h-12 w-full rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/80 pl-12 pr-32 text-[14px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-primary)] focus:bg-[var(--color-surface-primary)]"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label="New tab address input"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="rounded border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                Enter
              </kbd>
            </div>
          </div>
        </section>

        {/* Quick Launch (primary operator surfaces) ------------------------ */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Quick launch"
            title="Operator surfaces"
            description="Jump into the workflows you use every day."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {primaryCards.map((card) => (
              <FeaturedCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        {/* Build surfaces ------------------------------------------------- */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Build"
            title="Maker and orchestration"
            description="Design agents, run operator workflows, and reach Power Platform makers."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {buildCards.map((card) => (
              <FeaturedCard key={card.label} card={card} />
            ))}
          </div>
        </section>

        {/* Agent Gallery (combined demos + showcases) -------------------- */}
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Gallery"
            title="Agent demos and showcases"
            description="Polished sample experiences and role-based showcase scenarios."
            action={
              <div className="inline-flex rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-0.5">
                {(['all', 'Demo', 'Showcase'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGalleryFilter(option)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      galleryFilter === option
                        ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {option === 'all' ? 'All' : `${option}s`}
                  </button>
                ))}
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredGallery.map((entry) => (
              <GalleryTile
                key={entry.tabType}
                entry={entry}
                onClick={() => addTab(entry.tabType)}
              />
            ))}
          </div>
        </section>

        {/* Tips strip ----------------------------------------------------- */}
        <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)]/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <Command className="h-3.5 w-3.5" />
              Tips
            </div>
            <ul className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[var(--color-text-secondary)]">
              <li>
                Type <span className="font-mono text-[var(--color-text-primary)]">@browser</span> in
                action mode to control the browser
              </li>
              <li>Drop a folder onto the sidebar to set your project</li>
              <li>Write runbooks in YAML to automate cross-tab workflows</li>
            </ul>
          </div>
        </section>

        {/* Footer --------------------------------------------------------- */}
        <footer className="flex items-center justify-between pb-2 text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-3 w-3" />
            <span>{APP_CONFIG.description}</span>
          </div>
          <span className="font-mono">
            {APP_CONFIG.name} v{APP_CONFIG.version}
          </span>
        </footer>
      </div>
    </div>
  );
}
