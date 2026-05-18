import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOOL_DEFINITIONS,
  ToolRegistry,
  createCopilotHubToolRegistry,
} from './toolRegistry';

describe('ToolRegistry', () => {
  it('registers tools and resolves them by canonical id or alias', () => {
    const registry = new ToolRegistry();

    registry.registerTool({
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
        targetSelectors: ['sessionId', 'threadId'],
        defaultTargeting: 'selectedSession',
        preferredServerId: 'default',
        mcpToolName: 'browser_navigate',
      },
    });

    expect(registry.getTool('browser.navigate')?.id).toBe('browser.navigate');
    expect(registry.getTool('browser_navigate')?.id).toBe('browser.navigate');
    expect(registry.getExecutionMetadata('browser_navigate')).toEqual({
      transport: 'mcp',
      jsonRpcMethod: 'tools/call',
      streamable: true,
      sessionBinding: 'required',
      targetSelectors: ['sessionId', 'threadId'],
      defaultTargeting: 'selectedSession',
      preferredServerId: 'default',
      mcpToolName: 'browser_navigate',
    });
  });

  it('filters tools by capability, session scope, availability, and streamability', () => {
    const registry = createCopilotHubToolRegistry();

    const graphTools = registry.listTools({
      capability: 'graph',
      sessionScope: 'global',
      availability: 'available',
      streamable: true,
    });

    expect(graphTools.map((tool) => tool.id)).toEqual([
      'graph.calendar.today',
      'graph.files.recent',
      'graph.mail.inbox',
      'graph.teams.messages',
      'graph.user.profile',
    ]);

    const sessionTools = registry.listTools({
      capability: ['browser', 'terminal', 'vscode', 'runbook'],
      sessionScope: 'session',
      availability: 'available',
    });

    expect(sessionTools.every((tool) => tool.sessionScope === 'session')).toBe(true);
    expect(sessionTools.some((tool) => tool.id === 'terminal.run')).toBe(true);
    expect(sessionTools.some((tool) => tool.id === 'vscode.open')).toBe(true);
    expect(sessionTools.some((tool) => tool.id === 'runbook.execute')).toBe(true);
  });

  it('rejects duplicate tool ids and alias conflicts', () => {
    const registry = new ToolRegistry();

    registry.registerTool({
      id: 'terminal.run',
      title: 'Terminal Run',
      description: 'Run terminal command',
      capability: 'terminal',
      sessionScope: 'session',
      availability: 'available',
      aliases: ['shell.exec'],
      execution: {
        transport: 'mcp',
        jsonRpcMethod: 'tools/call',
        streamable: true,
        sessionBinding: 'required',
        targetSelectors: ['sessionId'],
        defaultTargeting: 'selectedSession',
        mcpToolName: 'shell.exec',
      },
    });

    expect(() =>
      registry.registerTool({
        id: 'terminal.run',
        title: 'Terminal Run 2',
        description: 'Duplicate id',
        capability: 'terminal',
        sessionScope: 'session',
        availability: 'available',
        execution: {
          transport: 'local',
          jsonRpcMethod: 'tools/call',
          streamable: true,
          sessionBinding: 'required',
          targetSelectors: ['sessionId'],
          defaultTargeting: 'selectedSession',
        },
      }),
    ).toThrow('Tool "terminal.run" is already registered.');

    expect(() =>
      registry.registerTool({
        id: 'runbook.execute',
        title: 'Runbook Execute',
        description: 'Conflicting alias',
        capability: 'runbook',
        sessionScope: 'session',
        availability: 'available',
        aliases: ['shell.exec'],
        execution: {
          transport: 'local',
          jsonRpcMethod: 'tools/call',
          streamable: true,
          sessionBinding: 'required',
          targetSelectors: ['sessionId'],
          defaultTargeting: 'selectedSession',
        },
      }),
    ).toThrow('Tool reference "shell.exec" is already registered by "terminal.run".');
  });

  it('supports replacing a registered tool definition', () => {
    const registry = new ToolRegistry();

    registry.registerTool({
      id: 'graph.user.profile',
      title: 'Graph User Profile',
      description: 'Placeholder profile tool',
      capability: 'graph',
      sessionScope: 'global',
      availability: 'placeholder',
      aliases: ['graph_profile'],
      execution: {
        transport: 'placeholder',
        jsonRpcMethod: 'tools/call',
        streamable: true,
        sessionBinding: 'optional',
        defaultTargeting: 'explicit',
      },
    });

    registry.registerTool(
      {
        id: 'graph.user.profile',
        title: 'Graph User Profile',
        description: 'Implemented profile tool',
        capability: 'graph',
        sessionScope: 'global',
        availability: 'available',
        aliases: ['graph_get_profile'],
        execution: {
          transport: 'local',
          jsonRpcMethod: 'tools/call',
          streamable: true,
          sessionBinding: 'optional',
          defaultTargeting: 'explicit',
        },
      },
      { replace: true },
    );

    expect(registry.getTool('graph.user.profile')?.availability).toBe('available');
    expect(registry.getTool('graph_profile')).toBeUndefined();
    expect(registry.getTool('graph_get_profile')?.id).toBe('graph.user.profile');
  });

  it('ships a default tool catalog covering current and planned capabilities', () => {
    const capabilities = new Set(DEFAULT_TOOL_DEFINITIONS.map((tool) => tool.capability));
    const browserNavigate = DEFAULT_TOOL_DEFINITIONS.find((tool) => tool.id === 'browser.navigate');

    expect(capabilities).toEqual(new Set(['browser', 'terminal', 'vscode', 'runbook', 'graph']));
    expect(DEFAULT_TOOL_DEFINITIONS.some((tool) => tool.id === 'browser.navigate')).toBe(true);
    expect(DEFAULT_TOOL_DEFINITIONS.some((tool) => tool.id === 'terminal.run')).toBe(true);
    expect(DEFAULT_TOOL_DEFINITIONS.some((tool) => tool.id === 'vscode.open')).toBe(true);
    expect(DEFAULT_TOOL_DEFINITIONS.some((tool) => tool.id === 'runbook.execute')).toBe(true);
    expect(DEFAULT_TOOL_DEFINITIONS.some((tool) => tool.id === 'graph.user.profile')).toBe(true);
    expect(browserNavigate?.execution.targetSelectors).toEqual([
      'sessionId',
      'threadId',
      'browserSessionId',
      'mcpSessionId',
    ]);
    expect(browserNavigate?.execution.defaultTargeting).toBe('selectedSession');
  });
});
