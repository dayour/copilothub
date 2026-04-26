import { useId, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  Activity,
  Bot,
  FileText,
  Gauge,
  History,
  Package,
  Terminal,
  type LucideProps,
} from 'lucide-react';

export type ClippyTerminalHostTabId = 'terminal' | 'sessions' | 'artifacts';
export type ClippyTerminalShellVariant = 'compact' | 'detailed' | 'diagnostic';
export type ClippyIndicatorTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ClippyStatusChip {
  label: string;
  tone?: ClippyIndicatorTone;
}

export interface ClippyMetricItem {
  label: string;
  value: string;
}

export interface ClippyTerminalSummary {
  shellLabel: string;
  workingDirectory: string;
  currentCommand: string;
  statusLabel: string;
  statusTone?: ClippyIndicatorTone;
  helperText?: string;
  latencyLabel?: string;
  lastOutputPreview?: string;
  metrics?: readonly ClippyMetricItem[];
}

export interface ClippySessionItem {
  id: string;
  label: string;
  detail: string;
  startedAt: string;
  ownerLabel?: string;
  stateLabel: string;
  stateTone?: ClippyIndicatorTone;
}

export interface ClippyArtifactItem {
  id: string;
  label: string;
  kindLabel: string;
  detail: string;
  updatedAt: string;
  statusLabel: string;
  statusTone?: ClippyIndicatorTone;
}

export interface ClippyTerminalShellProps {
  title?: string;
  subtitle?: string;
  assistantName?: string;
  variant?: ClippyTerminalShellVariant;
  activeTab?: ClippyTerminalHostTabId;
  defaultTab?: ClippyTerminalHostTabId;
  onTabChange?: (tabId: ClippyTerminalHostTabId) => void;
  terminal: ClippyTerminalSummary;
  sessions: readonly ClippySessionItem[];
  artifacts: readonly ClippyArtifactItem[];
  statusChips?: readonly ClippyStatusChip[];
  diagnostics?: readonly string[];
  footerHint?: string;
  className?: string;
}

interface ClippyVariantPreset {
  label: string;
  description: string;
  frameClassName: string;
  panelClassName: string;
}

interface ClippyHostTabDefinition {
  id: ClippyTerminalHostTabId;
  label: string;
  icon: ComponentType<LucideProps>;
}

const HOST_TABS: readonly ClippyHostTabDefinition[] = [
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'sessions', label: 'Sessions', icon: History },
  { id: 'artifacts', label: 'Artifacts', icon: Package },
];

export const CLIPPY_TERMINAL_SHELL_PRESETS: Record<ClippyTerminalShellVariant, ClippyVariantPreset> = {
  compact: {
    label: 'Compact host shell',
    description: 'Dense host framing for narrow surfaces and demos.',
    frameClassName: 'gap-3 rounded-xl',
    panelClassName: 'rounded-xl p-3',
  },
  detailed: {
    label: 'Detailed operator view',
    description: 'Balanced shell density with room for state and artifact detail.',
    frameClassName: 'gap-4 rounded-2xl',
    panelClassName: 'rounded-2xl p-4',
  },
  diagnostic: {
    label: 'Diagnostic trace view',
    description: 'Operator-focused framing that keeps diagnostics visible.',
    frameClassName: 'gap-4 rounded-2xl ring-1 ring-amber-400/20',
    panelClassName: 'rounded-2xl border-amber-400/20 bg-[var(--color-surface-secondary)]/90 p-4',
  },
};

function joinClasses(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function toneClassName(tone: ClippyIndicatorTone): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/15 text-amber-200';
    case 'danger':
      return 'border-red-500/30 bg-red-500/15 text-red-200';
    case 'neutral':
    default:
      return 'border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]';
  }
}

function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: ClippyIndicatorTone;
}) {
  return (
    <span className={joinClasses(
      'inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium',
      toneClassName(tone),
    )}
    >
      {label}
    </span>
  );
}

function SurfaceCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: ComponentType<LucideProps>;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icon;

  return (
    <section
      className={joinClasses(
        'border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]/70',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-[var(--color-text-primary)]">
        <Icon size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TerminalPanel({
  terminal,
  variant,
}: {
  terminal: ClippyTerminalSummary;
  variant: ClippyTerminalShellVariant;
}) {
  const metrics = terminal.metrics ?? [];
  const isCompact = variant === 'compact';

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)]">
      <SurfaceCard
        title="Terminal status"
        icon={Terminal}
        className={joinClasses(
          variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {terminal.shellLabel}
            </div>
            <div className="mt-1 text-sm text-[var(--color-text-primary)]">{terminal.currentCommand}</div>
            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{terminal.workingDirectory}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={terminal.statusLabel} tone={terminal.statusTone} />
            {terminal.latencyLabel && <StatusChip label={terminal.latencyLabel} />}
          </div>
        </div>

        {terminal.helperText && (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{terminal.helperText}</p>
        )}

        {terminal.lastOutputPreview && (
          <pre className={joinClasses(
            'mt-3 overflow-x-auto rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-xs leading-5 text-[var(--color-text-secondary)]',
            isCompact ? 'max-h-[124px]' : 'max-h-[188px]',
          )}
          >
            {terminal.lastOutputPreview}
          </pre>
        )}
      </SurfaceCard>

      <SurfaceCard
        title="Shell metrics"
        icon={Gauge}
        className={joinClasses(
          variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4',
        )}
      >
        {metrics.length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/80 p-3"
              >
                <dt className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {metric.label}
                </dt>
                <dd className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{metric.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="text-sm text-[var(--color-text-secondary)]">
            Metrics are waiting for a live host binding.
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

function SessionsPanel({
  sessions,
  variant,
}: {
  sessions: readonly ClippySessionItem[];
  variant: ClippyTerminalShellVariant;
}) {
  if (sessions.length === 0) {
    return (
      <SurfaceCard
        title="Sessions"
        icon={History}
        className={variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4'}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          No shell sessions are attached yet.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="grid gap-3">
      {sessions.map((session) => (
        <SurfaceCard
          key={session.id}
          title={session.label}
          icon={History}
          className={variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4'}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={session.stateLabel} tone={session.stateTone} />
            <span className="text-xs text-[var(--color-text-muted)]">{session.startedAt}</span>
            {session.ownerLabel && (
              <span className="text-xs text-[var(--color-text-secondary)]">{session.ownerLabel}</span>
            )}
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{session.detail}</p>
        </SurfaceCard>
      ))}
    </div>
  );
}

function ArtifactsPanel({
  artifacts,
  variant,
}: {
  artifacts: readonly ClippyArtifactItem[];
  variant: ClippyTerminalShellVariant;
}) {
  if (artifacts.length === 0) {
    return (
      <SurfaceCard
        title="Artifacts"
        icon={Package}
        className={variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4'}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          Generated artifacts will appear here after a run finishes.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {artifacts.map((artifact) => (
        <SurfaceCard
          key={artifact.id}
          title={artifact.label}
          icon={FileText}
          className={variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4'}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={artifact.kindLabel} />
            <StatusChip label={artifact.statusLabel} tone={artifact.statusTone} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{artifact.detail}</p>
          <div className="mt-3 text-xs text-[var(--color-text-muted)]">{artifact.updatedAt}</div>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function ClippyTerminalShell({
  title = 'Clippy terminal host',
  subtitle = 'Tabbed host shell pattern for terminal, sessions, and artifacts.',
  assistantName = 'Clippy',
  variant = 'detailed',
  activeTab,
  defaultTab = 'terminal',
  onTabChange,
  terminal,
  sessions,
  artifacts,
  statusChips = [],
  diagnostics = [],
  footerHint,
  className,
}: ClippyTerminalShellProps) {
  const preset = CLIPPY_TERMINAL_SHELL_PRESETS[variant];
  const isControlled = activeTab !== undefined;
  const [internalTab, setInternalTab] = useState<ClippyTerminalHostTabId>(defaultTab);
  const selectedTab = isControlled ? activeTab : internalTab;
  const shellId = useId();

  const selectedPanel = useMemo(() => {
    switch (selectedTab) {
      case 'sessions':
        return <SessionsPanel sessions={sessions} variant={variant} />;
      case 'artifacts':
        return <ArtifactsPanel artifacts={artifacts} variant={variant} />;
      case 'terminal':
      default:
        return <TerminalPanel terminal={terminal} variant={variant} />;
    }
  }, [artifacts, selectedTab, sessions, terminal, variant]);

  return (
    <section
      className={joinClasses(
        'flex flex-col border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)]',
        preset.frameClassName,
        className,
      )}
      data-variant={variant}
    >
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
              <Bot size={18} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {assistantName}
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <StatusChip label={preset.label} tone={variant === 'diagnostic' ? 'warning' : 'neutral'} />
          <div className="max-w-md text-sm text-[var(--color-text-secondary)]">{preset.description}</div>
        </div>
      </header>

      {statusChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <StatusChip key={`${chip.label}-${chip.tone ?? 'neutral'}`} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Clippy terminal host tabs"
          className="flex flex-wrap gap-2"
        >
          {HOST_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = tab.id === selectedTab;

            return (
              <button
                key={tab.id}
                id={`${shellId}-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`${shellId}-${tab.id}-panel`}
                onClick={() => {
                  if (!isControlled) {
                    setInternalTab(tab.id);
                  }
                  onTabChange?.(tab.id);
                }}
                className={joinClasses(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                  isSelected
                    ? 'border-[var(--color-border-focus)] bg-[var(--color-tab-active)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div
          id={`${shellId}-${selectedTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${shellId}-${selectedTab}-tab`}
          className={joinClasses(
            'border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/70',
            preset.panelClassName,
          )}
        >
          {selectedPanel}
        </div>
      </div>

      {(variant === 'diagnostic' || diagnostics.length > 0 || footerHint) && (
        <SurfaceCard
          title={variant === 'diagnostic' ? 'Diagnostics' : 'Host notes'}
          icon={variant === 'diagnostic' ? Activity : Gauge}
          className={variant === 'compact' ? 'rounded-xl p-3' : 'rounded-2xl p-4'}
        >
          {diagnostics.length > 0 ? (
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              {diagnostics.map((entry) => (
                <li key={entry} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Diagnostics surface is ready for host-level telemetry and binding notes.
            </p>
          )}

          {footerHint && (
            <div className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {footerHint}
            </div>
          )}
        </SurfaceCard>
      )}
    </section>
  );
}
