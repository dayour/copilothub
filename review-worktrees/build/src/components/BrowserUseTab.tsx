// ---------------------------------------------------------------------------
// BrowserUseTab.tsx -- Browser Use workspace combining a browser viewport
// with the action timeline, live overlay, and screenshot strip.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { Globe, Circle, Camera, Square } from 'lucide-react';
import mcpClient from '../lib/mcpClient';
import { useBrowserActionStore } from '../store/browserActionStore';
import { ActionTimeline } from './ActionTimeline';
import { LiveActionOverlay } from './LiveActionOverlay';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BrowserUseTab({ isActive }: { isActive: boolean }) {
  const [url, setUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const currentSessionId = useBrowserActionStore((s) => s.currentSessionId);

  const handleGo = useCallback(async () => {
    if (!url.trim()) return;
    await mcpClient.navigate(url.trim());
  }, [url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleGo();
    },
    [handleGo],
  );

  const handleToggleRecord = useCallback(async () => {
    if (isRecording) {
      await mcpClient.callTool('browser_follow_me_stop', {});
      setIsRecording(false);
    } else {
      await mcpClient.callTool('browser_follow_me_start', {});
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleScreenshot = useCallback(async () => {
    await mcpClient.screenshot();
  }, []);

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {/* ---- Top bar ---- */}
      <div className="flex items-center gap-2 h-12 px-3 border-b border-border-subtle bg-surface-secondary flex-shrink-0">
        <Globe size={16} className="text-text-muted flex-shrink-0" />

        {/* URL input */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL or describe a goal..."
          className="flex-1 h-8 px-3 rounded-md text-sm bg-surface-primary border border-border-subtle
                     text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />

        {/* Go button */}
        <button
          type="button"
          onClick={handleGo}
          className="h-8 px-3 rounded-md text-xs font-medium bg-accent-primary text-white
                     hover:bg-accent-primary/90 transition-colors"
        >
          Go
        </button>

        {/* Session indicator */}
        {currentSessionId && (
          <span className="text-[11px] text-text-muted bg-surface-tertiary rounded px-2 py-1 truncate max-w-[120px]">
            {currentSessionId}
          </span>
        )}

        {/* Record button */}
        <button
          type="button"
          onClick={handleToggleRecord}
          className={`p-1.5 rounded-md transition-colors ${
            isRecording
              ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <Square size={16} /> : <Circle size={16} />}
        </button>

        {/* Screenshot button */}
        <button
          type="button"
          onClick={handleScreenshot}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Take screenshot"
          title="Take screenshot"
        >
          <Camera size={16} />
        </button>
      </div>

      {/* ---- Main area ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: browser viewport */}
        <div className="flex-1 relative bg-surface-primary">
          <div className="flex items-center justify-center w-full h-full text-text-muted select-none">
            <div className="text-center space-y-2">
              <Globe size={48} className="mx-auto opacity-30" />
              <p className="text-sm">
                Browser viewport — connect sidecar to enable live view
              </p>
            </div>
          </div>
          {/* Live action overlay */}
          <LiveActionOverlay />
        </div>

        {/* Right panel: action timeline */}
        <div className="w-80 border-l border-border-subtle flex-shrink-0 overflow-hidden">
          <ActionTimeline />
        </div>
      </div>

      {/* ---- Bottom strip: screenshot stream ---- */}
      <div className="h-36 border-t border-border-subtle bg-surface-secondary flex items-center justify-center flex-shrink-0">
        <div className="flex items-center gap-2 text-text-muted select-none">
          <Camera size={16} className="opacity-50" />
          <span className="text-xs">Screenshots will appear here</span>
        </div>
      </div>
    </div>
  );
}
