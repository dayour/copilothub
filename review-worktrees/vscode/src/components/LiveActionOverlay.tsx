// ---------------------------------------------------------------------------
// LiveActionOverlay.tsx -- Floating overlay showing real-time browser
// automation status on top of browser tab content.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import {
  Globe,
  MousePointerClick,
  Keyboard,
  Camera,
  Eye,
  Loader2,
  X,
} from 'lucide-react';

import {
  useBrowserActionStore,
  type BrowserAction,
  type BrowserActionType,
} from '../store/browserActionStore';
import { useAppStore } from '../store/appStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map action type to a Lucide icon component. */
function actionIcon(type: BrowserActionType) {
  switch (type) {
    case 'navigate':
      return Globe;
    case 'click':
    case 'hover':
    case 'drag':
    case 'select-option':
      return MousePointerClick;
    case 'type':
    case 'press-key':
    case 'fill-form':
      return Keyboard;
    case 'screenshot':
      return Camera;
    case 'snapshot':
    case 'observe':
      return Eye;
    default:
      return Loader2;
  }
}

/** Produce a human-readable label for a browser action. */
function describeAction(action: BrowserAction): string {
  const args = action.args ?? {};

  switch (action.type) {
    case 'navigate': {
      const url = String(args.url ?? '');
      const display = url.length > 50 ? url.slice(0, 50) + '…' : url;
      return `Navigating to ${display}`;
    }
    case 'click': {
      const target = String(args.element ?? args.ref ?? 'element');
      return `Clicking ${target}`;
    }
    case 'type': {
      const raw = String(args.text ?? '');
      const text = raw.length > 30 ? raw.slice(0, 30) + '…' : raw;
      return `Typing "${text}"`;
    }
    case 'screenshot':
      return 'Capturing screenshot';
    case 'snapshot':
      return 'Analyzing page structure';
    case 'evaluate':
      return 'Running script';
    case 'scroll':
      return 'Scrolling page';
    case 'wait':
      return 'Waiting…';
    case 'observe':
      return 'Observing page state';
    case 'follow-me':
      return 'Recording actions';
    default:
      return `Executing ${action.toolName}`;
  }
}

/** Format elapsed milliseconds as a compact string (e.g. "1.2 s"). */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveActionOverlay() {
  const showOverlay = useAppStore((s) => s.showActionOverlay);
  const isAutomationActive = useBrowserActionStore(
    (s) => s.isAutomationActive,
  );
  const actions = useBrowserActionStore((s) => s.actions);

  // Derive the latest running/pending actions (max 3, newest first)
  const recentActive = useMemo(() => {
    return actions
      .filter((a) => a.status === 'running' || a.status === 'pending')
      .slice(-3)
      .reverse();
  }, [actions]);

  // Early exits
  if (!showOverlay) return null;
  if (!isAutomationActive || recentActive.length === 0) return null;

  const primary = recentActive[0];
  const extraCount = recentActive.length - 1;
  const Icon = actionIcon(primary.type);
  const elapsed = Date.now() - primary.startTime;

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50
        transition-all duration-300 opacity-100
        bg-zinc-900/90 backdrop-blur-sm border border-zinc-700
        rounded-xl shadow-2xl px-4 py-3"
      style={{ minWidth: 320, maxWidth: 600 }}
    >
      <div className="flex items-center gap-3">
        {/* ---- Pulsing green dot ---- */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>

        {/* ---- Action description ---- */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-zinc-100 font-medium truncate">
            <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="truncate">{describeAction(primary)}</span>
            {extraCount > 0 && (
              <span className="ml-1 shrink-0 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] leading-none text-zinc-300">
                +{extraCount} more
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
            <span className="truncate">{primary.toolName}</span>
            <span>·</span>
            <span>{formatElapsed(elapsed)}</span>
          </div>
        </div>

        {/* ---- Screenshot thumbnail ---- */}
        {primary.screenshotUrl && (
          <img
            src={primary.screenshotUrl}
            alt="Screenshot"
            className="h-8 w-8 rounded object-cover border border-zinc-600 shrink-0"
          />
        )}

        {/* ---- Dismiss button ---- */}
        <button
          type="button"
          onClick={() => useAppStore.getState().toggleActionOverlay()}
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss overlay"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
