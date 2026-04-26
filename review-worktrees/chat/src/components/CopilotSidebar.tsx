// ---------------------------------------------------------------------------
// CopilotSidebar.tsx -- Right-side collapsible Copilot panel.
// Shows quick chat, recent activity, and MCP sidecar status.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  X, MessageSquare, Zap, Server, BookOpen,
  Camera, Eye, Play, Square, Activity, ChevronDown, ChevronRight,
  CalendarDays, ExternalLink, FolderOpen, GitBranch, Mail, RefreshCw, User,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { EMPTY_CHAT_MESSAGES, useChatStore } from '../store/chatStore';
import type { ChatMessage } from '../store/chatStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';
import { useBrowserActionStore } from '../store/browserActionStore';
import type {
  GraphCalendarEvent,
  GraphDriveItem,
  GraphMailMessage,
  GraphUserProfile,
} from '../lib/graphClient';
import graphClient from '../lib/graphClient';
import {
  GRAPH_WIDGET_SCOPES,
  formatGraphWidgetError,
  isGraphSidebarConfigured,
} from '../lib/graphSidebar';
import mcpClient from '../lib/mcpClient';

type GraphWidgetStatus = 'idle' | 'loading' | 'ready' | 'error';

interface GraphWidgetState<T> {
  status: GraphWidgetStatus;
  data: T | null;
  error: string | null;
}

interface GraphWidgetsState {
  profile: GraphWidgetState<GraphUserProfile>;
  calendar: GraphWidgetState<GraphCalendarEvent[]>;
  files: GraphWidgetState<GraphDriveItem[]>;
  mail: GraphWidgetState<GraphMailMessage[]>;
}

const GRAPH_WIDGET_LIMIT = 3;
const GRAPH_CALENDAR_FETCH_LIMIT = 6;

function createIdleWidgetState<T>(): GraphWidgetState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function createIdleGraphWidgetsState(): GraphWidgetsState {
  return {
    profile: createIdleWidgetState<GraphUserProfile>(),
    calendar: createIdleWidgetState<GraphCalendarEvent[]>(),
    files: createIdleWidgetState<GraphDriveItem[]>(),
    mail: createIdleWidgetState<GraphMailMessage[]>(),
  };
}

function createLoadingWidgetState<T>(): GraphWidgetState<T> {
  return {
    status: 'loading',
    data: null,
    error: null,
  };
}

function createLoadingGraphWidgetsState(): GraphWidgetsState {
  return {
    profile: createLoadingWidgetState<GraphUserProfile>(),
    calendar: createLoadingWidgetState<GraphCalendarEvent[]>(),
    files: createLoadingWidgetState<GraphDriveItem[]>(),
    mail: createLoadingWidgetState<GraphMailMessage[]>(),
  };
}

function createReadyWidgetState<T>(data: T): GraphWidgetState<T> {
  return {
    status: 'ready',
    data,
    error: null,
  };
}

function createErrorWidgetState<T>(error: unknown, scopes: readonly string[]): GraphWidgetState<T> {
  return {
    status: 'error',
    data: null,
    error: formatGraphWidgetError(error, scopes),
  };
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function filterTodayCalendarEvents(events: GraphCalendarEvent[]): GraphCalendarEvent[] {
  const today = new Date();

  return events.filter((event) => {
    if (!event.start?.dateTime) {
      return false;
    }

    const start = new Date(event.start.dateTime);
    return !Number.isNaN(start.getTime()) && isSameDay(start, today);
  }).slice(0, GRAPH_WIDGET_LIMIT);
}

function formatDateTime(value?: string): string {
  if (!value) return 'Time unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatShortDate(value?: string): string {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function profilePrimaryEmail(profile: GraphUserProfile): string {
  return profile.mail ?? profile.userPrincipalName ?? 'No email available';
}

function mailSender(message: GraphMailMessage): string {
  return message.from?.emailAddress?.displayName
    ?? message.from?.emailAddress?.userPrincipalName
    ?? message.sender?.emailAddress?.displayName
    ?? message.sender?.emailAddress?.userPrincipalName
    ?? 'Unknown sender';
}

function eventLocation(event: GraphCalendarEvent): string {
  return event.location?.displayName?.trim() || 'No location';
}

function cardStatusText(status: GraphWidgetStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading';
    case 'error':
      return 'Error';
    case 'ready':
      return 'Live';
    case 'idle':
    default:
      return 'Idle';
  }
}

function cardStatusClass(status: GraphWidgetStatus): string {
  switch (status) {
    case 'loading':
      return 'text-status-warning';
    case 'error':
      return 'text-status-error';
    case 'ready':
      return 'text-status-success';
    case 'idle':
    default:
      return 'text-text-muted';
  }
}

interface GraphCardProps {
  title: string;
  status: GraphWidgetStatus;
  error: string | null;
  action?: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}

function GraphCard({
  title,
  status,
  error,
  action,
  icon,
  children,
}: GraphCardProps) {
  return (
    <section className="rounded-md bg-surface-tertiary/70 border border-border-subtle p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-text-secondary flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-text-primary">{title}</div>
            <div className={`text-[10px] uppercase tracking-wide ${cardStatusClass(status)}`}>
              {cardStatusText(status)}
            </div>
          </div>
        </div>
        {action}
      </div>

      {status === 'loading' && (
        <div className="text-[12px] text-text-muted">Loading Microsoft Graph data...</div>
      )}

      {status === 'error' && (
        <div className="text-[12px] text-status-error">{error ?? 'Unable to load this Graph widget.'}</div>
      )}

      {status === 'ready' && children}

      {status === 'idle' && (
        <div className="text-[12px] text-text-muted">Graph widget is waiting to load.</div>
      )}
    </section>
  );
}

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

function actionStatusDot(status: 'pending' | 'running' | 'completed' | 'error') {
  switch (status) {
    case 'completed':
      return 'bg-status-success';
    case 'running':
      return 'bg-status-warning animate-pulse';
    case 'error':
      return 'bg-status-error';
    case 'pending':
    default:
      return 'bg-text-muted';
  }
}

function formatToolName(toolName: string): string {
  return toolName.replace(/^browser_/, '');
}

function formatDuration(ms?: number): string {
  if (ms == null) return '…';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function CopilotSidebar() {
  const copilotSidebarOpen = useAppStore((s) => s.copilotSidebarOpen);
  const openReviewPane = useAppStore((s) => s.openReviewPane);
  const toggleCopilotSidebar = useAppStore((s) => s.toggleCopilotSidebar);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const selectedThread = useSessionEnvironmentStore((s) => s.selectedThread());
  const messages = useChatStore(
    (s) => s.threadStateById[selectedThread?.id ?? 'default-thread']?.messages ?? EMPTY_CHAT_MESSAGES,
  );
  const isProcessing = useChatStore(
    (s) => s.threadStateById[selectedThread?.id ?? 'default-thread']?.isProcessing ?? false,
  );
  const sendMessage = useChatStore((s) => s.sendMessage);

  const browserActions = useBrowserActionStore((s) => s.actions);

  const [quickInput, setQuickInput] = useState('');
  const [browserSectionOpen, setBrowserSectionOpen] = useState(true);
  const [graphSectionOpen, setGraphSectionOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [graphRefreshCount, setGraphRefreshCount] = useState(0);
  const [graphWidgets, setGraphWidgets] = useState<GraphWidgetsState>(() => createIdleGraphWidgetsState());

  const graphConfigured = isGraphSidebarConfigured();

  const recentMessages = useMemo(
    () => messages.slice(-5).reverse(),
    [messages],
  );

  const latestActions = useMemo(
    () => [...browserActions].reverse().slice(0, 3),
    [browserActions],
  );

  const graphLoading = useMemo(
    () => Object.values(graphWidgets).some((widget) => widget.status === 'loading'),
    [graphWidgets],
  );

  useEffect(() => {
    if (!copilotSidebarOpen || !graphConfigured || !isAuthenticated) {
      setGraphWidgets(createIdleGraphWidgetsState());
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;
    setGraphWidgets(createLoadingGraphWidgetsState());

    void Promise.allSettled([
      graphClient.getMe({ signal: abortController.signal }),
      graphClient.listCalendarEvents({ top: GRAPH_CALENDAR_FETCH_LIMIT, signal: abortController.signal }),
      graphClient.listRecentDriveFiles({ top: GRAPH_WIDGET_LIMIT, signal: abortController.signal }),
      graphClient.listMailMessages({ top: GRAPH_WIDGET_LIMIT, unreadOnly: true, signal: abortController.signal }),
    ]).then(([profileResult, calendarResult, filesResult, mailResult]) => {
      if (cancelled) {
        return;
      }

      setGraphWidgets({
        profile: profileResult.status === 'fulfilled'
          ? createReadyWidgetState(profileResult.value)
          : createErrorWidgetState(profileResult.reason, GRAPH_WIDGET_SCOPES.profile),
        calendar: calendarResult.status === 'fulfilled'
          ? createReadyWidgetState(filterTodayCalendarEvents(calendarResult.value.value))
          : createErrorWidgetState(calendarResult.reason, GRAPH_WIDGET_SCOPES.calendar),
        files: filesResult.status === 'fulfilled'
          ? createReadyWidgetState(filesResult.value.value.slice(0, GRAPH_WIDGET_LIMIT))
          : createErrorWidgetState(filesResult.reason, GRAPH_WIDGET_SCOPES.files),
        mail: mailResult.status === 'fulfilled'
          ? createReadyWidgetState(mailResult.value.value.slice(0, GRAPH_WIDGET_LIMIT))
          : createErrorWidgetState(mailResult.reason, GRAPH_WIDGET_SCOPES.mail),
      });
    });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [copilotSidebarOpen, graphConfigured, graphRefreshCount, isAuthenticated]);

  function handleQuickSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = quickInput.trim();
    if (!trimmed || isProcessing) return;
    sendMessage(trimmed, selectedThread?.id);
    setQuickInput('');
  }

  if (!copilotSidebarOpen) return null;

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-border-default bg-surface-secondary"
      aria-label="Copilot sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span className="text-[13px] font-semibold text-text-primary">Copilot</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openReviewPane}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Open Git review pane"
            title="Open Git review pane"
          >
            <GitBranch size={16} />
          </button>
          <button
            type="button"
            onClick={toggleCopilotSidebar}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Close Copilot sidebar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Chat */}
      <div className="px-3 py-3 border-b border-border-default">
        <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">
          Quick Chat
        </div>
        {selectedThread && (
          <div className="mb-2 text-[11px] text-text-muted">
            Active thread: <span className="text-text-secondary">{selectedThread.title}</span>
          </div>
        )}
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

      {/* Browser Actions */}
      <div className="px-3 py-3 border-b border-border-default">
        <button
          type="button"
          onClick={() => setBrowserSectionOpen((v) => !v)}
          className="flex items-center gap-1.5 w-full text-left text-[11px] uppercase tracking-wide text-text-muted mb-2 hover:text-text-secondary transition-colors"
          aria-expanded={browserSectionOpen}
        >
          {browserSectionOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Activity size={12} />
          <span>Browser Actions</span>
        </button>

        {browserSectionOpen && (
          <>
            {/* Quick action buttons */}
            <div className="space-y-1 mb-2">
              <button
                type="button"
                onClick={() => mcpClient.screenshot()}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-secondary transition-colors w-full text-left text-text-primary"
              >
                <Camera size={14} className="text-text-secondary flex-shrink-0" />
                Take Screenshot
              </button>
              <button
                type="button"
                onClick={() => mcpClient.snapshot()}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-secondary transition-colors w-full text-left text-text-primary"
              >
                <Eye size={14} className="text-text-secondary flex-shrink-0" />
                Capture Snapshot
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isRecording) {
                    mcpClient.callTool('browser_follow_me_stop', {});
                  } else {
                    mcpClient.callTool('browser_follow_me_start', {});
                  }
                  setIsRecording((v) => !v);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-surface-secondary transition-colors w-full text-left text-text-primary"
              >
                {isRecording ? (
                  <Square size={14} className="text-status-error flex-shrink-0" />
                ) : (
                  <Play size={14} className="text-text-secondary flex-shrink-0" />
                )}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>

            {/* Live action mini-feed */}
            {latestActions.length > 0 && (
              <ul className="space-y-0.5 mb-2">
                {latestActions.map((action) => (
                  <li
                    key={action.id}
                    className="flex items-center gap-2 text-[11px] text-text-secondary"
                    style={{ height: '24px' }}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${actionStatusDot(action.status)}`}
                    />
                    <span className="truncate flex-1">
                      {formatToolName(action.toolName)}
                    </span>
                    <span className="text-text-muted flex-shrink-0">
                      {formatDuration(action.duration)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer */}
            <div className="text-[11px] text-text-muted">
              {browserActions.length} total action{browserActions.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Graph Widgets */}
      <div className="px-3 py-3 border-b border-border-default">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            type="button"
            onClick={() => setGraphSectionOpen((v) => !v)}
            className="flex items-center gap-1.5 text-left text-[11px] uppercase tracking-wide text-text-muted hover:text-text-secondary transition-colors"
            aria-expanded={graphSectionOpen}
          >
            {graphSectionOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <CalendarDays size={12} />
            <span>Microsoft Graph</span>
          </button>

          {graphConfigured && isAuthenticated && (
            <button
              type="button"
              onClick={() => setGraphRefreshCount((value) => value + 1)}
              disabled={graphLoading}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={12} className={graphLoading ? 'animate-spin' : ''} />
              <span>{graphLoading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {graphSectionOpen && (
          <>
            {!graphConfigured && (
              <div className="rounded-md bg-surface-tertiary/70 border border-border-subtle p-3">
                <div className="text-[12px] font-medium text-text-primary mb-1">
                  Graph widgets are not configured
                </div>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  CopilotHub is still using the placeholder Entra client ID. Replace it with a
                  real app registration before loading calendar, files, and inbox data.
                </p>
              </div>
            )}

            {graphConfigured && !isAuthenticated && (
              <div className="rounded-md bg-surface-tertiary/70 border border-border-subtle p-3">
                <div className="text-[12px] font-medium text-text-primary mb-1">
                  Sign in to load Graph widgets
                </div>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  Connect your Entra account to populate your profile, today&apos;s calendar,
                  recent files, and unread inbox summary.
                </p>
              </div>
            )}

            {graphConfigured && isAuthenticated && (
              <div className="space-y-2">
                <GraphCard
                  title="Profile Summary"
                  status={graphWidgets.profile.status}
                  error={graphWidgets.profile.error}
                  icon={<User size={14} />}
                >
                  {graphWidgets.profile.data ? (
                    <div className="space-y-1">
                      <div className="text-[12px] font-medium text-text-primary">
                        {graphWidgets.profile.data.displayName ?? 'Signed-in user'}
                      </div>
                      <div className="text-[12px] text-text-secondary">
                        {profilePrimaryEmail(graphWidgets.profile.data)}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {graphWidgets.profile.data.jobTitle ?? 'Role unavailable'}
                        {graphWidgets.profile.data.officeLocation
                          ? `, ${graphWidgets.profile.data.officeLocation}`
                          : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[12px] text-text-muted">No profile details available.</div>
                  )}
                </GraphCard>

                <GraphCard
                  title="My Calendar Today"
                  status={graphWidgets.calendar.status}
                  error={graphWidgets.calendar.error}
                  icon={<CalendarDays size={14} />}
                  action={(
                    <a
                      href="https://outlook.office.com/calendar/view/day"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                >
                  {graphWidgets.calendar.data && graphWidgets.calendar.data.length > 0 ? (
                    <ul className="space-y-2">
                      {graphWidgets.calendar.data.map((event) => (
                        <li key={event.id} className="text-[12px]">
                          <div className="font-medium text-text-primary">
                            {event.subject ?? 'Untitled event'}
                          </div>
                          <div className="text-text-secondary">
                            {formatDateTime(event.start?.dateTime)}
                          </div>
                          <div className="text-text-muted">{eventLocation(event)}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[12px] text-text-muted">
                      No calendar events scheduled for today.
                    </div>
                  )}
                </GraphCard>

                <GraphCard
                  title="Recent Files"
                  status={graphWidgets.files.status}
                  error={graphWidgets.files.error}
                  icon={<FolderOpen size={14} />}
                  action={(
                    <a
                      href="https://www.office.com/launch/onedrive"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                >
                  {graphWidgets.files.data && graphWidgets.files.data.length > 0 ? (
                    <ul className="space-y-2">
                      {graphWidgets.files.data.map((file) => (
                        <li key={file.id} className="text-[12px]">
                          {file.webUrl ? (
                            <a
                              href={file.webUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-accent-primary hover:text-accent-hover transition-colors"
                            >
                              {file.name ?? 'Unnamed file'}
                            </a>
                          ) : (
                            <div className="font-medium text-text-primary">
                              {file.name ?? 'Unnamed file'}
                            </div>
                          )}
                          <div className="text-text-muted">
                            Modified {formatShortDate(file.lastModifiedDateTime ?? file.createdDateTime)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[12px] text-text-muted">
                      No recent OneDrive files were returned.
                    </div>
                  )}
                </GraphCard>

                <GraphCard
                  title="Mail Inbox"
                  status={graphWidgets.mail.status}
                  error={graphWidgets.mail.error}
                  icon={<Mail size={14} />}
                  action={(
                    <a
                      href="https://outlook.office.com/mail/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                >
                  {graphWidgets.mail.data && graphWidgets.mail.data.length > 0 ? (
                    <ul className="space-y-2">
                      {graphWidgets.mail.data.map((message) => (
                        <li key={message.id} className="text-[12px]">
                          {message.webLink ? (
                            <a
                              href={message.webLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-accent-primary hover:text-accent-hover transition-colors"
                            >
                              {message.subject ?? 'No subject'}
                            </a>
                          ) : (
                            <div className="font-medium text-text-primary">
                              {message.subject ?? 'No subject'}
                            </div>
                          )}
                          <div className="text-text-secondary">{mailSender(message)}</div>
                          <div
                            className="text-text-muted overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {message.bodyPreview ?? 'No preview available.'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[12px] text-text-muted">
                      No unread inbox messages right now.
                    </div>
                  )}
                </GraphCard>
              </div>
            )}
          </>
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

