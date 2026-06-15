// ---------------------------------------------------------------------------
// toolRegistry.ts -- Unified CopilotHub tool catalog.
// Provides typed registration, lookup, and filtering for browser, terminal,
// VS Code, runbook, and Graph tool definitions without coupling to transport.
// ---------------------------------------------------------------------------

import rawToolCatalog from '../shared/toolCatalog.json';

export const TOOL_CAPABILITIES = ['browser', 'terminal', 'vscode', 'runbook', 'graph'] as const;
export type ToolCapability = (typeof TOOL_CAPABILITIES)[number];

export const TOOL_SESSION_SCOPES = ['global', 'session'] as const;
export type ToolSessionScope = (typeof TOOL_SESSION_SCOPES)[number];

export type ToolAvailability = 'available' | 'placeholder';
export type ToolTransport = 'local' | 'mcp' | 'placeholder';
export type ToolSessionBinding = 'none' | 'optional' | 'required';
export type ToolTargetSelector =
  | 'sessionId'
  | 'threadId'
  | 'browserSessionId'
  | 'mcpSessionId';
export type ToolDefaultTargeting = 'selectedSession' | 'explicit';

export type ToolInputPropertyType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ToolInputPropertySchema {
  type: ToolInputPropertyType;
  description?: string;
  enum?: readonly string[];
  items?: ToolInputPropertySchema;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolInputPropertySchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
}

export interface ToolExecutionMetadata {
  transport: ToolTransport;
  jsonRpcMethod: 'tools/call';
  streamable: boolean;
  sessionBinding: ToolSessionBinding;
  targetSelectors?: readonly ToolTargetSelector[];
  defaultTargeting?: ToolDefaultTargeting;
  preferredServerId?: string;
  mcpToolName?: string;
}

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  capability: ToolCapability;
  sessionScope: ToolSessionScope;
  availability: ToolAvailability;
  /** When true the tool requires an active Entra SSO session at runtime (defect D7). */
  requiresEntraAuth?: boolean;
  aliases?: readonly string[];
  tags?: readonly string[];
  inputSchema?: ToolInputSchema;
  execution: ToolExecutionMetadata;
}

export interface ToolListFilters {
  capability?: ToolCapability | readonly ToolCapability[];
  sessionScope?: ToolSessionScope | readonly ToolSessionScope[];
  availability?: ToolAvailability | readonly ToolAvailability[];
  streamable?: boolean;
  requiresEntraAuth?: boolean;
}

interface RawToolInputPropertySchema {
  type: ToolInputPropertyType;
  description?: string;
  enum?: string[];
  items?: RawToolInputPropertySchema;
}

interface RawToolInputSchema {
  type: 'object';
  properties: Record<string, RawToolInputPropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

interface RawToolExecutionMetadata {
  transport: ToolTransport;
  jsonRpcMethod: 'tools/call';
  streamable: boolean;
  sessionBinding: ToolSessionBinding;
  targetSelectors?: ToolTargetSelector[];
  defaultTargeting?: ToolDefaultTargeting;
  preferredServerId?: string;
  mcpToolName?: string;
}

interface RawToolDefinition {
  id: string;
  title: string;
  description: string;
  capability: ToolCapability;
  sessionScope: ToolSessionScope;
  availability: ToolAvailability;
  requiresEntraAuth?: boolean;
  aliases?: string[];
  tags?: string[];
  inputSchema?: RawToolInputSchema;
  execution: RawToolExecutionMetadata;
}

function matchesFilter<T extends string>(value: T, filter?: T | readonly T[]): boolean {
  if (!filter) {
    return true;
  }

  const values = Array.isArray(filter) ? filter : [filter];
  return values.includes(value);
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly references = new Map<string, string>();

  constructor(initialTools?: readonly ToolDefinition[]) {
    if (initialTools) {
      this.registerTools(initialTools);
    }
  }

  registerTool(definition: ToolDefinition, options?: { replace?: boolean }): void {
    const existingTool = this.tools.get(definition.id);
    if (existingTool && !options?.replace) {
      throw new Error(`Tool "${definition.id}" is already registered.`);
    }

    if (existingTool) {
      this.unregisterReferences(existingTool);
    }

    this.assertReferenceAvailable(definition.id, definition.id, options?.replace === true);

    for (const alias of definition.aliases ?? []) {
      this.assertReferenceAvailable(alias, definition.id, options?.replace === true);
    }

    this.tools.set(definition.id, definition);
    this.references.set(definition.id, definition.id);

    for (const alias of definition.aliases ?? []) {
      this.references.set(alias, definition.id);
    }
  }

  registerTools(definitions: readonly ToolDefinition[], options?: { replace?: boolean }): void {
    for (const definition of definitions) {
      this.registerTool(definition, options);
    }
  }

  getTool(reference: string): ToolDefinition | undefined {
    const id = this.references.get(reference) ?? reference;
    return this.tools.get(id);
  }

  getExecutionMetadata(reference: string): ToolExecutionMetadata | undefined {
    return this.getTool(reference)?.execution;
  }

  listTools(filters: ToolListFilters = {}): ToolDefinition[] {
    return [...this.tools.values()]
      .filter((tool) => matchesFilter(tool.capability, filters.capability))
      .filter((tool) => matchesFilter(tool.sessionScope, filters.sessionScope))
      .filter((tool) => matchesFilter(tool.availability, filters.availability))
      .filter((tool) => filters.streamable === undefined || tool.execution.streamable === filters.streamable)
      .filter((tool) => filters.requiresEntraAuth === undefined || (tool.requiresEntraAuth ?? false) === filters.requiresEntraAuth)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  private unregisterReferences(definition: ToolDefinition): void {
    this.references.delete(definition.id);

    for (const alias of definition.aliases ?? []) {
      this.references.delete(alias);
    }
  }

  private assertReferenceAvailable(reference: string, ownerId: string, replacing: boolean): void {
    const existingOwner = this.references.get(reference);
    if (!existingOwner) {
      return;
    }

    if (replacing && existingOwner === ownerId) {
      return;
    }

    throw new Error(`Tool reference "${reference}" is already registered by "${existingOwner}".`);
  }
}

function cloneInputPropertySchema(
  schema: RawToolInputPropertySchema,
): ToolInputPropertySchema {
  return {
    type: schema.type,
    description: schema.description,
    enum: schema.enum,
    items: schema.items ? cloneInputPropertySchema(schema.items) : undefined,
  };
}

function cloneInputSchema(schema: RawToolInputSchema): ToolInputSchema {
  return {
    type: schema.type,
    properties: Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, cloneInputPropertySchema(value)]),
    ),
    required: schema.required,
    additionalProperties: schema.additionalProperties,
  };
}

function normalizeToolDefinition(definition: RawToolDefinition): ToolDefinition {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    capability: definition.capability,
    sessionScope: definition.sessionScope,
    availability: definition.availability,
    requiresEntraAuth: definition.requiresEntraAuth,
    aliases: definition.aliases,
    tags: definition.tags,
    inputSchema: definition.inputSchema ? cloneInputSchema(definition.inputSchema) : undefined,
    execution: {
      transport: definition.execution.transport,
      jsonRpcMethod: definition.execution.jsonRpcMethod,
      streamable: definition.execution.streamable,
      sessionBinding: definition.execution.sessionBinding,
      targetSelectors: definition.execution.targetSelectors,
      defaultTargeting: definition.execution.defaultTargeting,
      preferredServerId: definition.execution.preferredServerId,
      mcpToolName: definition.execution.mcpToolName,
    },
  };
}

const rawDefinitions = rawToolCatalog as RawToolDefinition[];

export const DEFAULT_TOOL_DEFINITIONS: readonly ToolDefinition[] = rawDefinitions.map(
  normalizeToolDefinition,
);

export function createCopilotHubToolRegistry(
  definitions: readonly ToolDefinition[] = DEFAULT_TOOL_DEFINITIONS,
): ToolRegistry {
  return new ToolRegistry(definitions);
}

const toolRegistry = createCopilotHubToolRegistry();

export default toolRegistry;
