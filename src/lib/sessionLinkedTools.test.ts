import { describe, expect, it, vi } from 'vitest';

import { createSessionEnvironment } from './sessionEnvironment';
import {
  executeSessionLinkedToolCall,
  prepareSessionLinkedToolCall,
  resolveSessionToolTarget,
} from './sessionLinkedTools';
import { createSessionThread } from './sessionThread';
import { ToolRegistry } from './toolRegistry';

const sessionA = createSessionEnvironment({
  id: 'session-a',
  name: 'Main',
  projectPath: 'E:\\copilothub',
  browserSessionId: 'browser-a',
  mcpSessionIds: ['mcp-a'],
  createdAt: 1,
  updatedAt: 1,
});

const sessionB = createSessionEnvironment({
  id: 'session-b',
  name: 'Bug Bash',
  projectPath: 'E:\\copilothub\\feature',
  browserSessionId: 'browser-b',
  mcpSessionIds: ['mcp-b', 'mcp-b-secondary'],
  createdAt: 2,
  updatedAt: 2,
});

const threadA = createSessionThread({
  id: 'thread-a',
  title: 'Main',
  projectPath: sessionA.projectPath,
  sessionEnvironmentId: sessionA.id,
  createdAt: 1,
  updatedAt: 1,
});

const threadB = createSessionThread({
  id: 'thread-b',
  title: 'Bug Bash',
  projectPath: sessionB.projectPath,
  sessionEnvironmentId: sessionB.id,
  createdAt: 2,
  updatedAt: 2,
});

const state = {
  sessions: [sessionA, sessionB],
  threads: [threadA, threadB],
  selectedSessionId: sessionA.id,
  selectedThreadId: threadA.id,
};

function createRegistry(): ToolRegistry {
  return new ToolRegistry([
    {
      id: 'browser.navigate',
      title: 'Browser Navigate',
      description: 'Navigate browser',
      capability: 'browser',
      sessionScope: 'session',
      availability: 'available',
      aliases: ['browser_navigate'],
      execution: {
        transport: 'mcp',
        jsonRpcMethod: 'tools/call',
        streamable: true,
        sessionBinding: 'required',
        targetSelectors: ['sessionId', 'threadId', 'browserSessionId', 'mcpSessionId'],
        defaultTargeting: 'selectedSession',
        preferredServerId: 'preferred',
        mcpToolName: 'browser_navigate',
      },
    },
  ]);
}

describe('sessionLinkedTools', () => {
  it('resolves the selected session when no explicit target is provided', () => {
    const resolved = resolveSessionToolTarget({}, state);

    expect(resolved).toMatchObject({
      sessionId: 'session-a',
      threadId: 'thread-a',
      projectPath: 'E:\\copilothub',
      resolutionSource: 'selectedSession',
    });
  });

  it('resolves thread, browser, and MCP identifiers back to the owning session', () => {
    expect(resolveSessionToolTarget({ threadId: 'thread-b' }, state)?.sessionId).toBe('session-b');
    expect(resolveSessionToolTarget({ browserSessionId: 'browser-b' }, state)?.sessionId).toBe('session-b');
    expect(resolveSessionToolTarget({ mcpSessionId: 'mcp-b' }, state)?.sessionId).toBe('session-b');
  });

  it('rejects conflicting target identifiers', () => {
    expect(() =>
      resolveSessionToolTarget({ sessionId: 'session-a', threadId: 'thread-b' }, state),
    ).toThrow('Target identifiers resolve to different CopilotHub sessions.');
  });

  it('prepares session-bound MCP calls with resolved target metadata', () => {
    const prepared = prepareSessionLinkedToolCall(
      {
        tool: 'browser.navigate',
        args: { url: 'https://example.com' },
        target: { threadId: 'thread-b' },
      },
      { registry: createRegistry(), state },
    );

    expect(prepared.resolvedToolName).toBe('browser_navigate');
    expect(prepared.resolvedTarget?.sessionId).toBe('session-b');
    expect(prepared.resolvedTarget?.sandbox.executionTarget).toBe('host');
    expect(prepared.mcpOptions).toEqual({
      preferredServerId: 'preferred',
      targetSessionId: 'session-b',
      targetThreadId: 'thread-b',
      targetBrowserSessionId: 'browser-b',
      targetMcpSessionId: 'mcp-b',
    });
  });

  it('executes MCP tools with isolated session routing options', async () => {
    const mcp = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'ok',
        error: undefined,
        isError: false,
      }),
    };

    const result = await executeSessionLinkedToolCall(
      {
        tool: 'browser.navigate',
        args: { url: 'https://example.com' },
        target: { browserSessionId: 'browser-b' },
      },
      { registry: createRegistry(), state, mcp },
    );

    expect(result.success).toBe(true);
    expect(result.prepared.resolvedTarget?.sessionId).toBe('session-b');
    expect(mcp.callTool).toHaveBeenCalledWith(
      'browser_navigate',
      { url: 'https://example.com' },
        {
          preferredServerId: 'preferred',
          targetSessionId: 'session-b',
          targetThreadId: 'thread-b',
          targetBrowserSessionId: 'browser-b',
          targetMcpSessionId: 'mcp-b',
        },
      );
  });

  it('preserves the explicitly targeted MCP session id when a session has multiple MCP bindings', () => {
    const prepared = prepareSessionLinkedToolCall(
      {
        tool: 'browser.navigate',
        args: { url: 'https://example.com' },
        target: { sessionId: 'session-b', mcpSessionId: 'mcp-b-secondary' },
      },
      { registry: createRegistry(), state },
    );

    expect(prepared.mcpOptions.targetMcpSessionId).toBe('mcp-b-secondary');
  });

  it('rejects ambiguous browser or MCP session identifiers', () => {
    const ambiguousState = {
      ...state,
      sessions: [
        sessionA,
        createSessionEnvironment({
          id: 'session-c',
          name: 'Duplicate Browser',
          projectPath: 'E:\\copilothub\\duplicate',
          browserSessionId: 'browser-a',
          mcpSessionIds: ['mcp-a'],
          createdAt: 3,
          updatedAt: 3,
        }),
      ],
      threads: [threadA],
    };

    expect(() =>
      resolveSessionToolTarget({ browserSessionId: 'browser-a' }, ambiguousState),
    ).toThrow('Ambiguous browserSessionId "browser-a" resolves to multiple CopilotHub sessions.');

    expect(() =>
      resolveSessionToolTarget({ mcpSessionId: 'mcp-a' }, ambiguousState),
    ).toThrow('Ambiguous mcpSessionId "mcp-a" resolves to multiple CopilotHub sessions.');
  });
});
