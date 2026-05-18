export interface ActionCommand {
  tool: string;
  args: Record<string, unknown>;
  raw: string;
}

export interface ActionResult {
  success: boolean;
  output: string;
  error?: string;
}

interface ActionToolResponse {
  success?: boolean;
  content?: unknown;
  output?: unknown;
  error?: unknown;
}

function normalizeInput(input: string): string {
  return input.trim();
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const char of input) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function asNonEmpty(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseBrowserCommand(commandText: string, raw: string): ActionCommand | null {
  const trimmed = commandText.trim();
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return null;
  }

  const verb = tokens[0].toLowerCase();

  if (verb === 'navigate' || verb === 'go' || verb === 'goto') {
    const toIndex = tokens[1]?.toLowerCase() === 'to' ? 2 : 1;
    const url = asNonEmpty(tokens.slice(toIndex).join(' '));
    if (!url || !isHttpUrl(url)) {
      return null;
    }

    return {
      tool: 'browser_navigate',
      args: { url },
      raw,
    };
  }

  if (verb === 'click') {
    const selectorStart = tokens[1]?.toLowerCase() === 'on' ? 2 : 1;
    const selector = asNonEmpty(tokens.slice(selectorStart).join(' '));
    if (!selector) {
      return null;
    }

    return {
      tool: 'browser_click',
      args: { element: selector, ref: selector },
      raw,
    };
  }

  if (verb === 'fill') {
    const selector = asNonEmpty(tokens[1]);
    const text = asNonEmpty(tokens.slice(2).join(' '));
    if (!selector || text === null) {
      return null;
    }

    return {
      tool: 'browser_fill',
      args: { element: selector, ref: selector, text },
      raw,
    };
  }

  if (verb === 'screenshot' && tokens.length === 1) {
    return {
      tool: 'browser_screenshot',
      args: {},
      raw,
    };
  }

  if (verb === 'snapshot' && tokens.length === 1) {
    return {
      tool: 'browser_snapshot',
      args: {},
      raw,
    };
  }

  return null;
}

function parseTerminalCommand(
  commandText: string,
  raw: string,
  options?: { allowBare?: boolean },
): ActionCommand | null {
  const trimmed = commandText.trim();
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return null;
  }

  let commandTextValue: string | null = null;
  if (tokens[0].toLowerCase() === 'run') {
    commandTextValue = tokens.slice(1).join(' ');
  } else if (options?.allowBare) {
    commandTextValue = trimmed;
  }

  const command = asNonEmpty(commandTextValue ?? undefined);
  if (!command) {
    return null;
  }

  return {
    tool: 'shell_exec',
    args: { command },
    raw,
  };
}

function parseVSCodeCommand(
  commandText: string,
  raw: string,
  options?: { allowBare?: boolean },
): ActionCommand | null {
  const trimmed = commandText.trim();
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return null;
  }

  let pathText: string | null = null;
  if (tokens[0].toLowerCase() === 'open') {
    pathText = tokens.slice(1).join(' ');
  } else if (options?.allowBare) {
    pathText = trimmed;
  }

  const path = asNonEmpty(pathText ?? undefined);
  if (!path) {
    return null;
  }

  return {
    tool: 'vscode_open',
    args: { path },
    raw,
  };
}

function parseRunbookCommand(
  commandText: string,
  raw: string,
  options?: { allowBare?: boolean },
): ActionCommand | null {
  const trimmed = commandText.trim();
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return null;
  }

  let nameText: string | null = null;
  if (tokens[0].toLowerCase() === 'run') {
    nameText = tokens.slice(1).join(' ');
  } else if (options?.allowBare) {
    nameText = trimmed;
  }

  const name = asNonEmpty(nameText ?? undefined);
  if (!name) {
    return null;
  }

  return {
    tool: 'runbook_execute',
    args: { name },
    raw,
  };
}

function parseFreeformMention(
  toolName: string,
  argKey: string,
  commandText: string,
  raw: string,
): ActionCommand | null {
  const value = asNonEmpty(commandText);
  if (!value) {
    return null;
  }
  return {
    tool: toolName,
    args: { [argKey]: value },
    raw,
  };
}

function parseMentionCommand(trimmedInput: string): ActionCommand | null {
  const mentionMatch = trimmedInput.match(
    /^@(browser|terminal|vscode|runbook|workiq|dataverse|agent365|graph|power)\b[:\s]+(.+)$/i,
  );
  if (!mentionMatch) {
    return null;
  }

  const target = mentionMatch[1].toLowerCase();
  const commandText = mentionMatch[2].trim();

  if (target === 'browser') {
    return parseBrowserCommand(commandText, trimmedInput);
  }

  if (target === 'terminal') {
    return parseTerminalCommand(commandText, trimmedInput, { allowBare: true });
  }

  if (target === 'vscode') {
    return parseVSCodeCommand(commandText, trimmedInput, { allowBare: true });
  }

  if (target === 'runbook') {
    return parseRunbookCommand(commandText, trimmedInput, { allowBare: true });
  }

  if (target === 'workiq' || target === 'agent365') {
    return parseFreeformMention('workiq_ask', 'question', commandText, trimmedInput);
  }

  if (target === 'dataverse') {
    return parseFreeformMention('dataverse_query', 'query', commandText, trimmedInput);
  }

  if (target === 'graph') {
    return parseFreeformMention('graph_query', 'query', commandText, trimmedInput);
  }

  if (target === 'power') {
    return parseFreeformMention('pac_run', 'command', commandText, trimmedInput);
  }

  return null;
}

function parseNaturalLanguage(trimmedInput: string): ActionCommand | null {
  return (
    parseBrowserCommand(trimmedInput, trimmedInput) ??
    parseTerminalCommand(trimmedInput, trimmedInput) ??
    parseVSCodeCommand(trimmedInput, trimmedInput) ??
    parseRunbookCommand(trimmedInput, trimmedInput)
  );
}

export function parseActionCommand(input: string): ActionCommand | null {
  const normalized = normalizeInput(input);
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.startsWith('@')) {
    return parseMentionCommand(normalized);
  }

  return parseNaturalLanguage(normalized);
}

function stringifyOutput(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (content === undefined || content === null) {
    return '';
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

export async function executeAction(
  command: ActionCommand,
  mcpClient: { callTool: (name: string, args: Record<string, unknown>) => Promise<ActionToolResponse> },
): Promise<ActionResult> {
  try {
    const response = await mcpClient.callTool(command.tool, command.args);
    const isSuccess = typeof response?.success === 'boolean' ? response.success : true;
    const outputSource = response?.content ?? response?.output ?? response;
    const output = stringifyOutput(outputSource);
    const error = typeof response?.error === 'string' ? response.error : undefined;

    return {
      success: isSuccess,
      output,
      error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: '',
      error: message,
    };
  }
}

export function formatActionResult(result: ActionResult): string {
  if (result.success) {
    const output = result.output.trim();
    return output.length > 0 ? `Action completed successfully.\n${output}` : 'Action completed successfully.';
  }

  const error = result.error?.trim();
  if (error && error.length > 0) {
    return `Action failed: ${error}`;
  }

  const fallbackOutput = result.output.trim();
  return fallbackOutput.length > 0 ? `Action failed: ${fallbackOutput}` : 'Action failed.';
}
