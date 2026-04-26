import { Bot, Gauge, Sparkles } from 'lucide-react';
import type { ClippyIndicatorTone } from './ClippyTerminalShell';

export type CompactClippyWidgetVariant = 'compact' | 'detailed' | 'diagnostic';

export interface CompactClippyWidgetMetric {
  label: string;
  value: string;
}

export interface CompactClippyWidgetAction {
  id: string;
  label: string;
  onSelect?: (actionId: string) => void;
  tone?: ClippyIndicatorTone;
}

export interface CompactClippyWidgetProps {
  title?: string;
  subtitle?: string;
  assistantName?: string;
  variant?: CompactClippyWidgetVariant;
  message: string;
  statusLabel: string;
  statusTone?: ClippyIndicatorTone;
  metrics?: readonly CompactClippyWidgetMetric[];
  actions?: readonly CompactClippyWidgetAction[];
  className?: string;
}

interface WidgetVariantPreset {
  label: string;
  description: string;
  frameClassName: string;
}

export const COMPACT_CLIPPY_WIDGET_PRESETS: Record<CompactClippyWidgetVariant, WidgetVariantPreset> = {
  compact: {
    label: 'Compact widget',
    description: 'Fits alongside sidebar and utility widgets.',
    frameClassName: 'gap-3 rounded-xl p-3',
  },
  detailed: {
    label: 'Detailed widget',
    description: 'Balanced density for host dashboard stacks.',
    frameClassName: 'gap-4 rounded-2xl p-4',
  },
  diagnostic: {
    label: 'Diagnostic widget',
    description: 'Emphasizes runtime state for demos and investigations.',
    frameClassName: 'gap-4 rounded-2xl border-amber-400/20 p-4',
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

export function CompactClippyWidget({
  title = 'Clippy widget',
  subtitle = 'Compact host companion surface for shell status and follow-up actions.',
  assistantName = 'Clippy',
  variant = 'compact',
  message,
  statusLabel,
  statusTone = 'neutral',
  metrics = [],
  actions = [],
  className,
}: CompactClippyWidgetProps) {
  const preset = COMPACT_CLIPPY_WIDGET_PRESETS[variant];
  const showDescription = variant !== 'compact';
  const showMetrics = metrics.length > 0 && variant !== 'compact';

  return (
    <aside
      className={joinClasses(
        'flex flex-col border border-[var(--color-border-default)] bg-[var(--color-surface-primary)]/95 shadow-[0_14px_35px_rgba(15,23,42,0.15)]',
        preset.frameClassName,
        className,
      )}
      data-variant={variant}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
          <Bot size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {assistantName}
            </span>
            <StatusChip label={statusLabel} tone={statusTone} />
          </div>
          <h3 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{message}</p>
        </div>
      </div>

      {showDescription && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]/70 p-3">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            {variant === 'diagnostic' ? (
              <Gauge size={15} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
            ) : (
              <Sparkles size={15} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">{preset.label}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{preset.description}</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      )}

      {showMetrics && (
        <dl className="grid gap-2 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]/70 p-3"
            >
              <dt className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {metric.label}
              </dt>
              <dd className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => action.onSelect?.(action.id)}
              className={joinClasses(
                'inline-flex items-center rounded-full border px-3 py-2 text-sm transition-colors',
                toneClassName(action.tone ?? 'neutral'),
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
