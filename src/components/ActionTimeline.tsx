// ---------------------------------------------------------------------------
// ActionTimeline.tsx -- Vertical timeline panel showing browser automation
// actions in real-time. Designed for both sidebar (~320px) and bottom dock
// (~200px tall) layouts.
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState, useMemo } from 'react';
import { useBrowserActionStore } from '../store/browserActionStore';
import type { BrowserAction, BrowserActionType } from '../store/browserActionStore';
import {
  Globe,
  MousePointerClick,
  Keyboard,
  Camera,
  Eye,
  Code,
  ArrowDown,
  Clock,
  Layers,
  Navigation,
  GripVertical,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the Lucide icon component that best represents a browser action. */
function getActionIcon(type: BrowserActionType): LucideIcon {
  const map: Record<string, LucideIcon> = {
    navigate: Globe,
    click: MousePointerClick,
    type: Keyboard,
    screenshot: Camera,
    snapshot: Eye,
    evaluate: Code,
    scroll: ArrowDown,
    wait: Clock,
    'multi-action': Layers,
    observe: Navigation,
    'follow-me': Play,
    hover: MousePointerClick,
    polish: Sparkles,
  };
  return map[type] ?? Code;
}

/** Tailwind color classes for each action status. */
function getStatusColor(status: BrowserAction['status']): string {
  const map: Record<BrowserAction['status'], string> = {
    pending: 'text-zinc-400',
    running: 'text-blue-400 animate-pulse',
    completed: 'text-emerald-400',
    error: 'text-red-400',
  };
  return map[status];
}

/** Return the icon component (and optional extra classes) for a status. */
function getStatusIcon(status: BrowserAction['status']): {
  Icon: LucideIcon;
  className?: string;
} {
  switch (status) {
    case 'pending':
      return { Icon: Clock };
    case 'running':
      return { Icon: Loader2, className: 'animate-spin' };
    case 'completed':
      return { Icon: CheckCircle2 };
    case 'error':
      return { Icon: XCircle };
  }
}

/** Format a duration in milliseconds as a compact human-readable string. */
function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '';
  if (ms < 1000) return '<1s';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

/** Produce a one-line summary of tool arguments. */
function summarizeArgs(
  toolName: string,
  args: Record<string, unknown>,
): string {
  if (toolName.includes('navigate') && typeof args.url === 'string') {
    return args.url;
  }
  if (toolName.includes('click')) {
    const label =
      (args.element as string) ?? (args.ref as string) ?? '';
    return label || 'element';
  }
  if (toolName.includes('type') && typeof args.text === 'string') {
    return args.text.length > 60 ? `${args.text.slice(0, 57)}...` : args.text;
  }
  if (toolName.includes('screenshot')) {
    return 'viewport';
  }
  const raw = JSON.stringify(args);
  return raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
}

// ---------------------------------------------------------------------------
// Border-color helper (non-text variant for the left accent)
// ---------------------------------------------------------------------------

function getStatusBorderColor(status: BrowserAction['status']): string {
  const map: Record<BrowserAction['status'], string> = {
    pending: 'border-zinc-400',
    running: 'border-blue-400',
    completed: 'border-emerald-400',
    error: 'border-red-400',
  };
  return map[status];
}

// ---------------------------------------------------------------------------
// Sub-component: ActionCard
// ---------------------------------------------------------------------------

function ActionCard({ action }: { action: BrowserAction }) {
  const [expanded, setExpanded] = useState(false);

  const StatusIcon = getStatusIcon(action.status);
  const ActionIcon = getActionIcon(action.type);
  const displayName = action.toolName.replace(/^browser_/, '');
  const summary = useMemo(
    () => summarizeArgs(action.toolName, action.args),
    [action.toolName, action.args],
  );
  const durationText = formatDuration(action.duration);

  return (
    <div
      className={`bg-surface-secondary rounded-md border-l-2 ${getStatusBorderColor(action.status)} transition-colors`}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left
                   hover:bg-surface-hover transition-colors rounded-md"
      >
        {/* Expand chevron */}
        {expanded ? (
          <ChevronDown size={12} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
        )}

        {/* Status icon */}
        <StatusIcon.Icon
          size={14}
          className={`flex-shrink-0 ${getStatusColor(action.status)} ${StatusIcon.className ?? ''}`}
        />

        {/* Action-type icon */}
        <ActionIcon size={14} className="flex-shrink-0 text-text-secondary" />

        {/* Tool name */}
        <span className="text-[12px] font-mono font-medium text-text-primary truncate">
          {displayName}
        </span>

        {/* Args summary */}
        <span className="text-[11px] text-text-muted truncate flex-1 min-w-0">
          {summary}
        </span>

        {/* Duration badge */}
        {durationText && (
          <span className="text-[10px] text-text-muted bg-surface-tertiary rounded px-1.5 py-0.5 flex-shrink-0">
            {durationText}
          </span>
        )}

        {/* Screenshot thumbnail indicator */}
        {action.screenshotUrl && (
          <Camera size={12} className="text-text-muted flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-2.5 space-y-2">
          {/* Full args */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Arguments
            </div>
            <pre className="text-[11px] font-mono text-text-secondary bg-surface-primary rounded p-2 overflow-x-auto max-h-40">
              <code>{JSON.stringify(action.args, null, 2)}</code>
            </pre>
          </div>

          {/* Result */}
          {action.result && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Result
              </div>
              <pre className="text-[11px] font-mono text-text-secondary bg-surface-primary rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-words">
                {action.result}
              </pre>
            </div>
          )}

          {/* Error */}
          {action.error && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">
                Error
              </div>
              <pre className="text-[11px] font-mono text-red-400 bg-red-400/10 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap break-words">
                {action.error}
              </pre>
            </div>
          )}

          {/* Screenshot thumbnail */}
          {action.screenshotUrl && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Screenshot
              </div>
              <a
                href={action.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={action.screenshotUrl}
                  alt="Browser screenshot"
                  className="w-12 h-12 object-cover rounded border border-border-subtle
                             hover:ring-2 hover:ring-accent-primary transition-shadow cursor-pointer"
                />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActionTimeline() {
  const actions = useBrowserActionStore((s) => s.actions);
  const clearActions = useBrowserActionStore((s) => s.clearActions);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new actions arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions]);

  const runningCount = useMemo(
    () =>
      actions.filter(
        (a) => a.status === 'pending' || a.status === 'running',
      ).length,
    [actions],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle flex-shrink-0">
        <GripVertical size={14} className="text-text-muted flex-shrink-0" />
        <span className="text-[13px] font-semibold text-text-primary">
          Browser Actions
        </span>
        {actions.length > 0 && (
          <span className="text-[11px] text-text-muted bg-surface-tertiary rounded-full px-2 py-0.5">
            {actions.length}
          </span>
        )}
        <div className="flex-1" />
        {actions.length > 0 && (
          <button
            type="button"
            onClick={clearActions}
            className="p-1 rounded text-text-muted hover:text-text-primary
                       hover:bg-surface-hover transition-colors"
            aria-label="Clear actions"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {actions.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-6 select-none">
          <Eye size={28} className="text-text-muted mb-2" />
          <p className="text-[12px] text-text-muted text-center leading-relaxed">
            No browser actions yet. Actions will appear here when the agent
            interacts with the browser.
          </p>
        </div>
      ) : (
        /* Scrollable action list */
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5"
        >
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Footer -- running count */}
      {runningCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border-subtle flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          <span className="text-[11px] text-text-muted">
            {runningCount} action{runningCount !== 1 ? 's' : ''} running
          </span>
        </div>
      )}
    </div>
  );
}
