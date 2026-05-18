// ---------------------------------------------------------------------------
// TitleBar.tsx -- Custom titlebar for CopilotHub (frameless window)
// Provides window controls (minimize, maximize, close) and app branding.
// ---------------------------------------------------------------------------

import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Window as TauriWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { useState } from 'react';

// Guard: getCurrentWindow() throws outside the Tauri runtime (plain browser).
let appWindow: TauriWindow | null = null;
try {
  appWindow = getCurrentWindow();
} catch {
  // Running in a browser — Tauri APIs unavailable.
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => appWindow?.minimize();
  const handleMaximize = async () => {
    if (!appWindow) return;
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => appWindow?.close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-surface-secondary select-none"
      style={{ height: 'var(--spacing-titlebar-height)' }}
    >
      {/* App branding */}
      <div className="flex items-center gap-2 pl-3" data-tauri-drag-region>
        <img
          src="/copilot-hub-mark.svg"
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
          data-tauri-drag-region
          draggable={false}
        />
        <span className="text-xs font-semibold text-text-secondary tracking-wide" data-tauri-drag-region>
          CopilotHub
        </span>
      </div>

      {/* Window controls (Tauri only — no-op in plain browser) */}
      {appWindow && (
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-12 h-full hover:bg-surface-hover transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-12 h-full hover:bg-surface-hover transition-colors"
          aria-label="Maximize"
        >
          {isMaximized ? (
            <Square size={12} className="text-text-secondary" />
          ) : (
            <Maximize2 size={12} className="text-text-secondary" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-12 h-full hover:bg-status-error transition-colors"
          aria-label="Close"
        >
          <X size={14} className="text-text-secondary" />
        </button>
      </div>
      )}
    </div>
  );
}
