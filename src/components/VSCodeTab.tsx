// ---------------------------------------------------------------------------
// VSCodeTab.tsx -- Embeds VS Code for the Web in a Tauri Webview tab
// Loads vscode.dev as an iframe for the MVP. Future: self-hosted build.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';

interface VSCodeTabProps {
  isActive: boolean;
}

export function VSCodeTab({ isActive }: VSCodeTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Focus the iframe when the tab becomes active
    if (isActive && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      className="w-full h-full"
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <iframe
        ref={iframeRef}
        src="https://vscode.dev"
        className="w-full h-full border-0"
        title="VS Code"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
