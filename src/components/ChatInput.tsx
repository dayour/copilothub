// ---------------------------------------------------------------------------
// ChatInput.tsx -- Multi-line chat input with send button, mode toggle,
// @mention autocomplete, and keyboard shortcuts.
// ---------------------------------------------------------------------------

import { useRef, useState, useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import type { MentionTarget } from '../store/chatStore';
import { useChat } from '../hooks/useChat';
import { SendHorizontal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Mention target definitions
// ---------------------------------------------------------------------------

interface MentionOption {
  value: MentionTarget;
  label: string;
  description: string;
}

const MENTION_TARGETS: MentionOption[] = [
  { value: '@browser',   label: 'browser',   description: 'Browser automation and web interaction' },
  { value: '@vscode',    label: 'vscode',    description: 'VS Code editor commands' },
  { value: '@terminal',  label: 'terminal',  description: 'Terminal and shell execution' },
  { value: '@runbook',   label: 'runbook',   description: 'Automated runbook execution' },
  { value: '@agent365',  label: 'agent365',  description: 'Microsoft 365 agent capabilities' },
  { value: '@dataverse', label: 'dataverse', description: 'Dataverse data queries and operations' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MentionContext {
  /** The partial text typed after the @ trigger (excluding the @). */
  query: string;
  /** Character index of the @ in the input string. */
  startIndex: number;
}

/**
 * Detect an active @mention trigger relative to the cursor position.
 * Returns null when the cursor is not inside a valid @mention context.
 */
function findMentionContext(
  text: string,
  cursorPos: number,
): MentionContext | null {
  const before = text.slice(0, cursorPos);
  const lastAt = before.lastIndexOf('@');
  if (lastAt === -1) return null;

  // The @ must be at the very start of the text or preceded by whitespace.
  if (lastAt > 0 && !/\s/.test(before[lastAt - 1])) return null;

  // Extract the query between @ and cursor. Reject if it contains spaces
  // (the user has moved past the mention token).
  const query = before.slice(lastAt + 1);
  if (/\s/.test(query)) return null;

  return { query, startIndex: lastAt };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate line height in pixels used for textarea auto-sizing. */
const LINE_HEIGHT_PX = 20;
const MIN_ROWS = 1;
const MAX_ROWS = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatInput() {
  // -- Store bindings --------------------------------------------------------
  const inputDraft = useChatStore((s) => s.inputDraft);
  const isProcessing = useChatStore((s) => s.isProcessing);
  const mode = useChatStore((s) => s.mode);
  const setInputDraft = useChatStore((s) => s.setInputDraft);
  const setMode = useChatStore((s) => s.setMode);
  const setActiveMention = useChatStore((s) => s.setActiveMention);

  // -- Chat bridge (routes through eventBridge / actionMode) ----------------
  const { sendMessage: chatSendMessage } = useChat();

  // -- Local state -----------------------------------------------------------
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [filteredTargets, setFilteredTargets] = useState<MentionOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionCtx, setMentionCtx] = useState<MentionContext | null>(null);

  // -- Textarea auto-height --------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to auto so scrollHeight reflects actual content height.
    el.style.height = 'auto';
    const minH = LINE_HEIGHT_PX * MIN_ROWS;
    const maxH = LINE_HEIGHT_PX * MAX_ROWS;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`;
  }, [inputDraft]);

  // -- Mention detection -----------------------------------------------------
  const updateMentionState = useCallback(
    (value: string, cursorPos: number) => {
      const ctx = findMentionContext(value, cursorPos);
      if (!ctx) {
        setShowMentions(false);
        setMentionCtx(null);
        return;
      }
      const matches = MENTION_TARGETS.filter((t) =>
        t.label.toLowerCase().startsWith(ctx.query.toLowerCase()),
      );
      if (matches.length > 0) {
        setFilteredTargets(matches);
        setSelectedIndex(0);
        setMentionCtx(ctx);
        setShowMentions(true);
      } else {
        setShowMentions(false);
        setMentionCtx(null);
      }
    },
    [],
  );

  // -- Handlers --------------------------------------------------------------

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInputDraft(value);
    updateMentionState(value, e.target.selectionStart);
  }

  function handleSend() {
    const trimmed = inputDraft.trim();
    if (!trimmed || isProcessing) return;
    void chatSendMessage(trimmed);
    setShowMentions(false);
    setMentionCtx(null);
  }

  function insertMention(mention: MentionTarget) {
    if (!mentionCtx) return;
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart ?? inputDraft.length;

    const before = inputDraft.slice(0, mentionCtx.startIndex);
    const after = inputDraft.slice(cursorPos);
    const newText = `${before}${mention} ${after}`;

    setInputDraft(newText);
    setActiveMention(mention);
    setShowMentions(false);
    setMentionCtx(null);

    // Reposition cursor after the inserted mention + trailing space.
    const newCursorPos = mentionCtx.startIndex + mention.length + 1;
    requestAnimationFrame(() => {
      const current = textareaRef.current;
      if (!current) return;
      current.focus();
      current.selectionStart = newCursorPos;
      current.selectionEnd = newCursorPos;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // -- Mention dropdown navigation takes priority when visible --
    if (showMentions && filteredTargets.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredTargets.length - 1),
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredTargets[selectedIndex].value);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        setMentionCtx(null);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredTargets[selectedIndex].value);
        return;
      }
    }

    // -- Standard keyboard shortcuts --
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === 'Escape') {
      setInputDraft('');
      setActiveMention(null);
    }
  }

  // -- Derived ---------------------------------------------------------------
  const canSend = inputDraft.trim().length > 0 && !isProcessing;

  // -- Render ----------------------------------------------------------------
  return (
    <div className="relative bg-surface-secondary border-t border-border-default">
      {/* -------- @mention autocomplete dropdown -------- */}
      {showMentions && filteredTargets.length > 0 && (
        <div
          className="absolute bottom-full left-0 right-0 mb-1 mx-3
                     bg-surface-elevated border border-border-default
                     rounded-md shadow-lg overflow-hidden z-50"
        >
          {filteredTargets.map((target, i) => (
            <button
              key={target.value}
              type="button"
              className={`flex items-center gap-3 w-full px-3 py-2 text-left
                          transition-colors text-[13px] ${
                            i === selectedIndex
                              ? 'bg-surface-hover text-text-primary'
                              : 'text-text-secondary hover:bg-surface-hover/50'
                          }`}
              onMouseDown={(ev) => {
                // Use mouseDown instead of click so the textarea does not
                // lose focus before the insertion completes.
                ev.preventDefault();
                insertMention(target.value);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-mono text-accent-primary text-[12px] w-24 flex-shrink-0">
                @{target.label}
              </span>
              <span className="text-text-muted text-[12px] truncate">
                {target.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* -------- Processing indicator -------- */}
      {isProcessing && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-0 text-[11px] text-text-muted">
          <span
            className="inline-block w-3 h-3 rounded-full border-2
                       border-accent-primary border-t-transparent"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <span>Processing...</span>
        </div>
      )}

      {/* -------- Input row -------- */}
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-surface-tertiary text-text-primary
                     rounded-md px-3 py-2 text-[13px] leading-[20px]
                     placeholder:text-text-muted
                     border border-border-subtle
                     focus:border-accent-primary focus:outline-none
                     transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: `${LINE_HEIGHT_PX * MIN_ROWS + 16}px` }}
          rows={1}
          placeholder={
            isProcessing
              ? 'Waiting for response...'
              : 'Type a message... (@ to mention a tool)'
          }
          value={inputDraft}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          aria-label="Chat message input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex items-center justify-center w-9 h-9 rounded-md
                     bg-accent-primary text-white
                     hover:bg-accent-hover active:bg-accent-active
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <SendHorizontal size={18} />
        </button>
      </div>

      {/* -------- Mode toggle -------- */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <button
          type="button"
          onClick={() => setMode('chat')}
          className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
            mode === 'chat'
              ? 'bg-accent-primary text-white'
              : 'bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
          aria-label="Chat mode"
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => setMode('action')}
          className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
            mode === 'action'
              ? 'bg-accent-primary text-white'
              : 'bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
          aria-label="Action mode"
        >
          Action
        </button>
      </div>

      {/* Spinner keyframes (scoped to this component) */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
