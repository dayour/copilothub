// ---------------------------------------------------------------------------
// TitleBar.tsx -- Custom titlebar for CopilotHub (frameless window)
// Provides window controls (minimize, maximize, close) and app branding.
// ---------------------------------------------------------------------------

import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { useState } from 'react';

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-surface-secondary select-none"
      style={{ height: 'var(--spacing-titlebar-height)' }}
    >
      {/* App branding */}
      <div className="flex items-center gap-2 pl-3" data-tauri-drag-region>
        <span className="text-xs font-semibold text-text-secondary tracking-wide" data-tauri-drag-region>
          CopilotHub
        </span>
      </div>

      {/* Window controls */}
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
    </div>
  );
}
