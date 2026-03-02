// ---------------------------------------------------------------------------
// ChatMessageList.tsx -- Scrollable chat message list with auto-scroll,
// manual markdown rendering, code blocks with copy, tool call display,
// and streaming cursor animation.
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage, ToolCall } from '../store/chatStore';
import { Copy, Check, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Markdown parsing -- no external libraries
// ---------------------------------------------------------------------------

/** A segment of message content: either plain text or a fenced code block. */
interface ContentSegment {
  type: 'text' | 'code-block';
  content: string;
  language?: string;
}

/** Split raw content into interleaved text and fenced-code-block segments. */
function splitCodeBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', content: raw.slice(last, m.index) });
    }
    segments.push({
      type: 'code-block',
      content: m[2].replace(/\n$/, ''),
      language: m[1] || undefined,
    });
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    segments.push({ type: 'text', content: raw.slice(last) });
  }
  return segments;
}

/**
 * Parse a single line for inline markdown tokens.
 * Supported: **bold**, `inline code`, *italic*, [text](url).
 * Alternation order ensures bold is matched before italic.
 */
function parseInline(line: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\*([^*\n]+?)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    // Text preceding this match
    if (m.index > last) {
      nodes.push(line.slice(last, m.index));
    }
    const key = `${keyBase}-i${k++}`;

    if (m[1] !== undefined) {
      // **bold**
      nodes.push(
        <strong key={key} className="font-semibold">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      // `inline code`
      nodes.push(
        <code
          key={key}
          className="px-1 py-0.5 rounded font-mono bg-black/15 text-[0.9em]"
        >
          {m[2]}
        </code>,
      );
    } else if (m[3] !== undefined) {
      // *italic*
      nodes.push(
        <em key={key} className="italic">
          {m[3]}
        </em>,
      );
    } else if (m[4] !== undefined && m[5] !== undefined) {
      // [text](url)
      nodes.push(
        <a
          key={key}
          href={m[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-current/60 hover:decoration-current"
        >
          {m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }

  if (last < line.length) {
    nodes.push(line.slice(last));
  }
  return nodes;
}

/**
 * Render a text segment (non-code-block) into paragraphs and lists.
 * Handles unordered (- / *) and ordered (1.) list prefixes.
 */
function renderTextSegment(text: string, segKey: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length === 0 || !listType) return;
    const cls =
      listType === 'ul'
        ? 'list-disc list-inside ml-2 space-y-0.5'
        : 'list-decimal list-inside ml-2 space-y-0.5';
    const tag =
      listType === 'ul' ? (
        <ul key={`list-${elements.length}`} className={cls}>
          {listItems}
        </ul>
      ) : (
        <ol key={`list-${elements.length}`} className={cls}>
          {listItems}
        </ol>
      );
    elements.push(tag);
    listItems = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trimStart();
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);

    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(
        <li key={`li-${i}`}>
          {parseInline(ulMatch[1], `${segKey}-${i}`)}
        </li>,
      );
    } else if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(
        <li key={`li-${i}`}>
          {parseInline(olMatch[1], `${segKey}-${i}`)}
        </li>,
      );
    } else {
      flushList();
      if (trimmed === '') {
        // Blank line becomes vertical spacing (only if not at the start)
        if (elements.length > 0) {
          elements.push(<div key={`sp-${i}`} className="h-1.5" />);
        }
      } else {
        elements.push(
          <p key={`p-${i}`} className="leading-relaxed">
            {parseInline(line, `${segKey}-${i}`)}
          </p>,
        );
      }
    }
  });

  flushList();
  return <>{elements}</>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Copy-to-clipboard button with transient "Copied" feedback. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable in some contexts -- silently ignore.
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]
                 text-text-secondary hover:text-text-primary
                 hover:bg-surface-hover transition-colors"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? (
        <>
          <Check size={12} />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/** Fenced code block with language header and copy button. */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="my-2 rounded-md overflow-hidden border border-border-subtle">
      <div
        className="flex items-center justify-between px-3 py-1
                    bg-surface-tertiary text-text-secondary text-[11px]"
      >
        <span className="font-mono">{language || 'text'}</span>
        <CopyButton text={code} />
      </div>
      <pre
        className="p-3 overflow-x-auto bg-surface-primary text-text-primary
                   text-[12px] leading-relaxed"
      >
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

/** Pulsing cursor appended to the end of a streaming message. */
function StreamingCursor() {
  return (
    <span
      className="inline-block w-[3px] h-[1em] rounded-sm ml-0.5
                 align-middle bg-accent-primary"
      style={{ animation: 'ch-cursor-blink 1s steps(2, start) infinite' }}
    />
  );
}

/** Render a single tool call: name, status, JSON args, result. */
function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const statusColor: Record<string, string> = {
    pending: 'text-text-muted',
    running: 'text-status-info',
    completed: 'text-status-success',
    error: 'text-status-error',
  };
  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    error: 'Error',
  };

  const argsJson = JSON.stringify(toolCall.args, null, 2);
  const hasArgs = Object.keys(toolCall.args).length > 0;

  return (
    <div className="my-2 rounded-md border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-tertiary">
        <Terminal size={12} className="text-text-secondary flex-shrink-0" />
        <span className="font-mono text-[12px] text-text-primary">
          {toolCall.name}
        </span>
        <span
          className={`text-[11px] ml-auto ${statusColor[toolCall.status] ?? 'text-text-muted'}`}
        >
          {statusLabel[toolCall.status] ?? toolCall.status}
          {toolCall.status === 'running' && (
            <span className="animate-pulse ml-0.5">...</span>
          )}
        </span>
      </div>

      {/* Arguments */}
      {hasArgs && (
        <div className="px-3 py-2 bg-surface-primary border-t border-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
            Arguments
          </div>
          <pre className="text-[12px] font-mono text-text-secondary overflow-x-auto">
            <code>{argsJson}</code>
          </pre>
        </div>
      )}

      {/* Result */}
      {toolCall.result && (
        <div
          className={`px-3 py-2 border-t border-border-subtle text-[12px] ${
            toolCall.status === 'error'
              ? 'text-status-error'
              : 'text-text-primary'
          }`}
          style={
            toolCall.status === 'error'
              ? { backgroundColor: 'rgba(244, 71, 71, 0.08)' }
              : undefined
          }
        >
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
            Result
          </div>
          <pre className="font-mono whitespace-pre-wrap break-words">
            {toolCall.result}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Render the full content of a message: splits code blocks from text,
 * applies inline markdown parsing, and appends a streaming cursor when
 * the message is still being streamed.
 */
function MessageContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const segments = useMemo(() => splitCodeBlocks(content), [content]);

  return (
    <div className="space-y-1">
      {segments.map((seg, i) =>
        seg.type === 'code-block' ? (
          <CodeBlock key={`cb-${i}`} code={seg.content} language={seg.language} />
        ) : (
          <div key={`tx-${i}`}>
            {renderTextSegment(seg.content, `s${i}`)}
          </div>
        ),
      )}
      {isStreaming && <StreamingCursor />}
    </div>
  );
}

/** A single chat message rendered according to its role. */
function MessageBubble({ message }: { message: ChatMessage }) {
  // -- System messages: centered, muted, small --
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2 px-4">
        <div className="max-w-md text-center text-text-muted text-[11px] px-3 py-1.5">
          <MessageContent content={message.content} isStreaming={false} />
        </div>
      </div>
    );
  }

  // -- Tool-role messages: left-aligned, distinctive border --
  if (message.role === 'tool') {
    return (
      <div className="flex justify-start my-1.5">
        <div className="max-w-[85%]">
          <div
            className="rounded-lg px-4 py-2.5 bg-surface-tertiary
                        border border-border-subtle text-text-primary"
          >
            <MessageContent
              content={message.content}
              isStreaming={message.isStreaming}
            />
          </div>
          <div className="text-[10px] text-text-muted mt-1 ml-1">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // -- User / Assistant messages --
  const isUser = message.role === 'user';

  return (
    <div className={`flex my-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%]">
        {/* Bubble */}
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser
              ? 'bg-accent-primary text-white'
              : 'bg-surface-elevated text-text-primary'
          }`}
        >
          <MessageContent
            content={message.content}
            isStreaming={message.isStreaming}
          />

          {/* Embedded tool calls */}
          {message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.toolCalls.map((tc) => (
                <ToolCallBlock key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] text-text-muted mt-1 ${
            isUser ? 'text-right mr-1' : 'ml-1'
          }`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ChatMessageList() {
  const messages = useChatStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message whenever the list changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Keyframes for the streaming cursor blink animation */}
      <style>{`
        @keyframes ch-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {messages.length === 0 ? (
        /* ---------- Empty state ---------- */
        <div className="flex-1 flex flex-col items-center justify-center select-none px-6">
          <div className="text-[18px] font-semibold text-text-secondary mb-1">
            CopilotHub
          </div>
          <div className="text-[13px] text-text-muted">
            Start a conversation
          </div>
          <div className="text-[11px] text-text-muted mt-3 text-center max-w-xs leading-relaxed">
            Type a message below or use @mentions to target specific tools
            such as @browser, @terminal, or @vscode.
          </div>
        </div>
      ) : (
        /* ---------- Message list ---------- */
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
