import type { SessionEnvironment } from './sessionEnvironment';
import type { SessionThread } from './sessionThread';
import type { MCPToolResult } from './mcpClient';
import mcpRegistry, { type MCPToolCallOptions } from './mcpRegistry';
import toolRegistry, { type ToolDefinition, type ToolRegistry } from './toolRegistry';
import { useSessionEnvironmentStore, type SessionEnvironmentStore } from '../store/sessionEnvironmentStore';

export interface ToolExecutionTarget {
  sessionId?: string;
  threadId?: string;
  browserSessionId?: string;
  mcpSessionId?: string;
}

export type SessionTargetResolutionSource =
  | 'sessionId'
  | 'threadId'
  | 'browserSessionId'
  | 'mcpSessionId'
  | 'selectedSession';

export interface SessionToolResolution {
  sessionId: string;
  threadId: string | null;
  projectPath: string;
  shellType: SessionEnvironment['shellType'];
  sandboxMode: SessionEnvironment['sandboxMode'];
  sandbox: SessionEnvironment['sandbox'];
  envVars: Record<string, string>;
  browserSessionId: string | null;
  mcpSessionIds: string[];
  resolutionSource: SessionTargetResolutionSource;
}

export interface SessionToolStoreSnapshot {
  sessions: SessionEnvironment[];
  threads: SessionThread[];
  selectedSessionId: string | null;
  selectedThreadId: string | null;
}

export interface SessionLinkedToolRequest {
  tool: string;
  args?: Record<string, unknown>;
  target?: ToolExecutionTarget;
}

export interface PreparedSessionLinkedToolCall {
  tool: ToolDefinition;
  requestedTool: string;
  resolvedToolName: string;
  args: Record<string, unknown>;
  target: ToolExecutionTarget;
  resolvedTarget: SessionToolResolution | null;
  mcpOptions: MCPToolCallOptions;
}

export interface SessionLinkedToolExecutionResult extends MCPToolResult {
  prepared: PreparedSessionLinkedToolCall;
}

type SessionToolStoreReader = Pick<
  SessionEnvironmentStore,
  'sessions' | 'threads' | 'selectedSessionId' | 'selectedThreadId'
>;

function createSessionResolution(
  session: SessionEnvironment,
  threads: SessionThread[],
  resolutionSource: SessionTargetResolutionSource,
  preferredThreadId?: string | null,
): SessionToolResolution {
  const linkedThreadId =
    preferredThreadId ??
    threads.find((thread) => thread.sessionEnvironmentId === session.id)?.id ??
    null;

  return {
    sessionId: session.id,
    threadId: linkedThreadId,
    projectPath: session.projectPath,
    shellType: session.shellType,
    sandboxMode: session.sandboxMode,
    sandbox: { ...session.sandbox, warnings: [...session.sandbox.warnings] },
    envVars: { ...session.envVars },
    browserSessionId: session.browserSessionId,
    mcpSessionIds: [...session.mcpSessionIds],
    resolutionSource,
  };
}

function getStoreSnapshot(
  override?: Partial<SessionToolStoreSnapshot>,
): SessionToolStoreSnapshot {
  const state = useSessionEnvironmentStore.getState();

  return {
    sessions: override?.sessions ?? state.sessions,
    threads: override?.threads ?? state.threads,
    selectedSessionId: override?.selectedSessionId ?? state.selectedSessionId,
    selectedThreadId: override?.selectedThreadId ?? state.selectedThreadId,
  };
}

export function resolveSessionToolTarget(
  target: ToolExecutionTarget = {},
  state: SessionToolStoreReader = useSessionEnvironmentStore.getState(),
): SessionToolResolution | null {
  const explicitMatches: SessionToolResolution[] = [];
  const { sessions, threads } = state;

  const sessionById = (sessionId: string) => sessions.find((session) => session.id === sessionId);
  const threadById = (threadId: string) => threads.find((thread) => thread.id === threadId);
  const uniqueSessionMatch = (
    sessionMatches: SessionEnvironment[],
    identifier: string,
    value: string,
  ): SessionEnvironment => {
    if (sessionMatches.length === 0) {
      throw new Error(`Unknown ${identifier} "${value}".`);
    }

    if (sessionMatches.length > 1) {
      throw new Error(`Ambiguous ${identifier} "${value}" resolves to multiple CopilotHub sessions.`);
    }

    return sessionMatches[0];
  };

  if (target.sessionId) {
    const session = sessionById(target.sessionId);
    if (!session) {
      throw new Error(`Unknown sessionId "${target.sessionId}".`);
    }

    explicitMatches.push(
      createSessionResolution(session, threads, 'sessionId', target.threadId ?? null),
    );
  }

  if (target.threadId) {
    const thread = threadById(target.threadId);
    if (!thread) {
      throw new Error(`Unknown threadId "${target.threadId}".`);
    }

    const session = sessionById(thread.sessionEnvironmentId);
    if (!session) {
      throw new Error(`Thread "${target.threadId}" is not linked to a session.`);
    }

    explicitMatches.push(createSessionResolution(session, threads, 'threadId', thread.id));
  }

  if (target.browserSessionId) {
    const session = uniqueSessionMatch(
      sessions.filter((candidate) => candidate.browserSessionId === target.browserSessionId),
      'browserSessionId',
      target.browserSessionId,
    );

    explicitMatches.push(createSessionResolution(session, threads, 'browserSessionId'));
  }

  if (target.mcpSessionId) {
    const targetMcpSessionId = target.mcpSessionId;
    const session = uniqueSessionMatch(
      sessions.filter((candidate) => candidate.mcpSessionIds.includes(targetMcpSessionId)),
      'mcpSessionId',
      targetMcpSessionId,
    );

    explicitMatches.push(createSessionResolution(session, threads, 'mcpSessionId'));
  }

  if (explicitMatches.length > 0) {
    const distinctSessionIds = new Set(explicitMatches.map((match) => match.sessionId));
    if (distinctSessionIds.size > 1) {
      throw new Error('Target identifiers resolve to different CopilotHub sessions.');
    }

    const threadId =
      explicitMatches.find((match) => match.threadId)?.threadId ??
      (target.threadId ?? null);

    return {
      ...explicitMatches[0],
      threadId,
    };
  }

  const selectedSessionId =
    state.selectedSessionId ??
    (state.selectedThreadId
      ? threadById(state.selectedThreadId)?.sessionEnvironmentId ?? null
      : null);
  if (!selectedSessionId) {
    return null;
  }

  const selectedSession = sessionById(selectedSessionId);
  if (!selectedSession) {
    return null;
  }

  return createSessionResolution(selectedSession, threads, 'selectedSession', state.selectedThreadId);
}

export function prepareSessionLinkedToolCall(
  request: SessionLinkedToolRequest,
  options?: {
    registry?: ToolRegistry;
    state?: SessionToolStoreSnapshot;
  },
): PreparedSessionLinkedToolCall {
  const registry = options?.registry ?? toolRegistry;
  const tool = registry.getTool(request.tool);
  if (!tool) {
    throw new Error(`Unknown tool "${request.tool}".`);
  }

  const snapshot = getStoreSnapshot(options?.state);
  const resolvedTarget = resolveSessionToolTarget(request.target, snapshot);

  if (tool.execution.sessionBinding === 'required' && !resolvedTarget) {
    throw new Error(`Tool "${tool.id}" requires a CopilotHub session target.`);
  }

  const resolvedToolName = tool.execution.mcpToolName ?? tool.id;
  const args = { ...(request.args ?? {}) };

  return {
    tool,
    requestedTool: request.tool,
    resolvedToolName,
    args,
    target: { ...(request.target ?? {}) },
    resolvedTarget,
    mcpOptions: {
      preferredServerId: tool.execution.preferredServerId,
      targetSessionId: resolvedTarget?.sessionId,
      targetThreadId: resolvedTarget?.threadId ?? undefined,
      targetBrowserSessionId: request.target?.browserSessionId ?? resolvedTarget?.browserSessionId ?? undefined,
      targetMcpSessionId: request.target?.mcpSessionId ?? resolvedTarget?.mcpSessionIds[0],
    },
  };
}

export async function executeSessionLinkedToolCall(
  request: SessionLinkedToolRequest,
  options?: {
    registry?: ToolRegistry;
    state?: SessionToolStoreSnapshot;
    mcp?: Pick<typeof mcpRegistry, 'callTool'>;
  },
): Promise<SessionLinkedToolExecutionResult> {
  const prepared = prepareSessionLinkedToolCall(request, options);

  if (prepared.tool.execution.transport !== 'mcp') {
    return {
      success: false,
      content: {
        toolId: prepared.tool.id,
        transport: prepared.tool.execution.transport,
        resolvedTarget: prepared.resolvedTarget,
      },
      error: `Tool "${prepared.tool.id}" does not have an MCP transport executor yet.`,
      isError: true,
      prepared,
    };
  }

  const registry = options?.mcp ?? mcpRegistry;
  const result = await registry.callTool(prepared.resolvedToolName, prepared.args, prepared.mcpOptions);
  return {
    ...result,
    prepared,
  };
}

export function getSessionToolStoreSnapshot(): SessionToolStoreSnapshot {
  return getStoreSnapshot();
}
