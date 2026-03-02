// ---------------------------------------------------------------------------
// CopilotSidebar.tsx -- Right-side collapsible Copilot panel.
// Shows quick chat, recent activity, and MCP sidecar status.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { X, MessageSquare, Zap, Server, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage } from '../store/chatStore';

function roleIcon(role: ChatMessage['role']) {
  switch (role) {
    case 'assistant':
      return <Zap size={14} className="text-status-info flex-shrink-0 mt-0.5" />;
    case 'tool':
      return <Server size={14} className="text-status-warning flex-shrink-0 mt-0.5" />;
    case 'system':
      return <BookOpen size={14} className="text-text-muted flex-shrink-0 mt-0.5" />;
    case 'user':
    default:
      return <MessageSquare size={14} className="text-accent-primary flex-shrink-0 mt-0.5" />;
  }
}

function statusDotClass(status: 'stopped' | 'starting' | 'running' | 'error') {
  switch (status) {
    case 'running':
      return 'bg-status-success';
    case 'starting':
      return 'bg-status-warning';
    case 'error':
      return 'bg-status-error';
    case 'stopped':
    default:
      return 'bg-text-muted';
  }
}

export function CopilotSidebar() {
  const copilotSidebarOpen = useAppStore((s) => s.copilotSidebarOpen);
  const toggleCopilotSidebar = useAppStore((s) => s.toggleCopilotSidebar);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);

  const messages = useChatStore((s) => s.messages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isProcessing = useChatStore((s) => s.isProcessing);

  const [quickInput, setQuickInput] = useState('');

  const recentMessages = useMemo(
    () => messages.slice(-5).reverse(),
    [messages],
  );

  function handleQuickSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = quickInput.trim();
    if (!trimmed || isProcessing) return;
    sendMessage(trimmed);
    setQuickInput('');
  }

  if (!copilotSidebarOpen) return null;

  return (
    <aside
      className={[
        'fixed right-0 z-40',
        'transition-transform duration-300 ease-out',
        'translate-x-0',
        'flex flex-col',
      ].join(' ')}
      style={{
        top: 'var(--spacing-titlebar-height)',
        width: '320px',
        height: 'calc(100vh - var(--spacing-titlebar-height))',
        backgroundColor: 'var(--color-surface-secondary)',
        borderLeft: '1px solid var(--color-border-default)',
        boxShadow: '-16px 0 28px rgba(0, 0, 0, 0.35)',
      }}
      aria-label="Copilot sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span className="text-[13px] font-semibold text-text-primary">Copilot</span>
        <button
          type="button"
          onClick={toggleCopilotSidebar}
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Close Copilot sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick Chat */}
      <div className="px-3 py-3 border-b border-border-default">
        <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">
          Quick Chat
        </div>
        <form className="flex items-center gap-2" onSubmit={handleQuickSend}>
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={isProcessing ? 'Waiting for response...' : 'Ask Copilot...'}
            disabled={isProcessing}
            className="flex-1 h-8 rounded-md px-2.5 text-[12px] bg-surface-tertiary text-text-primary placeholder:text-text-muted border border-border-subtle focus:outline-none focus:border-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Quick chat input"
          />
          <button
            type="submit"
            disabled={!quickInput.trim() || isProcessing}
            className="h-8 px-2.5 rounded-md text-[12px] font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      {/* Recent Activity */}
      <div className="px-3 py-3 border-b border-border-default min-h-0 flex-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">
          Recent Activity
        </div>
        {recentMessages.length === 0 ? (
          <div className="text-[12px] text-text-muted">No recent messages.</div>
        ) : (
          <ul className="space-y-2">
            {recentMessages.map((msg) => (
              <li
                key={msg.id}
                className="rounded-md bg-surface-tertiary/70 border border-border-subtle p-2"
              >
                <div className="flex items-start gap-2">
                  {roleIcon(msg.role)}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-text-secondary capitalize mb-0.5">
                      {msg.role}
                    </div>
                    <p
                      className="text-[12px] text-text-primary break-words overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {msg.content || (msg.isStreaming ? 'Streaming response...' : '(empty)')}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status Panel */}
      <div className="px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">
          Status Panel
        </div>
        <div className="flex items-center gap-2 text-[12px] text-text-primary">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDotClass(sidecarStatus)}`} />
          <span>MCP Sidecar: {sidecarStatus}</span>
        </div>
      </div>
    </aside>
  );
}

