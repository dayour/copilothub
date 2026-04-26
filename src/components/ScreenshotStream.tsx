import { useMemo, useState, useRef, useEffect } from 'react';
import {
  useBrowserActionStore,
  type BrowserAction,
} from '../store/browserActionStore';
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ScreenshotCard – compact thumbnail for a single screenshot action
// ---------------------------------------------------------------------------

function ScreenshotCard({
  action,
  onExpand,
}: {
  action: BrowserAction;
  onExpand: (url: string) => void;
}) {
  const time = new Date(action.timestamp);
  const ts = [time.getHours(), time.getMinutes(), time.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');

  return (
    <button
      type="button"
      onClick={() => onExpand(action.screenshotUrl!)}
      className="flex-none border border-zinc-700 rounded-lg overflow-hidden
                 bg-zinc-900 hover:border-zinc-500 transition-colors
                 cursor-pointer group"
      style={{ width: 160, scrollSnapAlign: 'start' }}
    >
      <img
        src={action.screenshotUrl}
        alt={`Screenshot – ${action.toolName}`}
        className="w-[160px] h-[100px] object-cover"
        draggable={false}
      />
      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-zinc-400">
        <span className="truncate">{action.toolName}</span>
        <span className="tabular-nums">{ts}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ScreenshotStream – horizontal rolling feed + expanded overlay
// ---------------------------------------------------------------------------

export function ScreenshotStream() {
  const actions = useBrowserActionStore((s) => s.actions);

  const screenshots = useMemo(
    () => actions.filter((a) => a.screenshotUrl),
    [actions],
  );

  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(screenshots.length);

  // Auto-scroll to newest screenshot
  useEffect(() => {
    if (screenshots.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
    prevCountRef.current = screenshots.length;
  }, [screenshots.length]);

  // Escape to close expanded view
  useEffect(() => {
    if (!expandedUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedUrl(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedUrl]);

  // Navigation arrows
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340; // ~2 cards
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <>
      {/* ---- Strip ---- */}
      <div className="max-h-[140px] bg-zinc-950 border border-zinc-800 rounded-xl p-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <Camera className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Screenshots</span>
          {screenshots.length > 0 && (
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 rounded-full tabular-nums">
              {screenshots.length}
            </span>
          )}

          {/* Nav arrows (only when overflow is likely) */}
          {screenshots.length > 3 && (
            <div className="ml-auto flex gap-0.5">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable strip */}
        {screenshots.length === 0 ? (
          <p className="text-[11px] text-zinc-600 italic px-1">
            Screenshots will appear as they are captured
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-none"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {screenshots.map((a) => (
              <ScreenshotCard key={a.id} action={a} onExpand={setExpandedUrl} />
            ))}
          </div>
        )}
      </div>

      {/* ---- Expanded overlay ---- */}
      {expandedUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setExpandedUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setExpandedUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/70
                       hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Full-size image */}
          <img
            src={expandedUrl}
            alt="Expanded screenshot"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
