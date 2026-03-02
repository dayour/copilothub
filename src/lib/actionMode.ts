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

function normalizeInput(input: string): string {
  return input.trim();
}

function asNonEmpty(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBrowserCommand(commandText: string, raw: string): ActionCommand | null {
  const navigateMatch = commandText.match(/^navigate\s+to\s+(https?:\/\/\S+)$/i);
  if (navigateMatch) {
    return {
      tool: 'browser_navigate',
      args: { url: navigateMatch[1] },
      raw,
    };
  }

  const clickMatch = commandText.match(/^click\s+(.+)$/i);
  if (clickMatch) {
    const selector = asNonEmpty(clickMatch[1]);
    if (!selector) {
      return null;
    }

    return {
      tool: 'browser_click',
      args: { element: selector, ref: selector },
      raw,
    };
  }

  const fillMatch = commandText.match(/^fill\s+(\S+)\s+(.+)$/i);
  if (fillMatch) {
    const selector = asNonEmpty(fillMatch[1]);
    const text = asNonEmpty(fillMatch[2]);
    if (!selector || text === null) {
      return null;
    }

    return {
      tool: 'browser_fill',
      args: { element: selector, ref: selector, text },
      raw,
    };
  }

  if (/^screenshot$/i.test(commandText)) {
    return {
      tool: 'browser_screenshot',
      args: {},
      raw,
    };
  }

  if (/^snapshot$/i.test(commandText)) {
    return {
      tool: 'browser_snapshot',
      args: {},
      raw,
    };
  }

  return null;
}

function parseTerminalCommand(commandText: string, raw: string): ActionCommand | null {
  const runMatch = commandText.match(/^run\s+(.+)$/i);
  if (!runMatch) {
    return null;
  }

  const command = asNonEmpty(runMatch[1]);
  if (!command) {
    return null;
  }

  return {
    tool: 'shell_exec',
    args: { command },
    raw,
  };
}

function parseVSCodeCommand(commandText: string, raw: string): ActionCommand | null {
  const openMatch = commandText.match(/^open\s+(.+)$/i);
  if (!openMatch) {
    return null;
  }

  const path = asNonEmpty(openMatch[1]);
  if (!path) {
    return null;
  }

  return {
    tool: 'vscode_open',
    args: { path },
    raw,
  };
}

function parseRunbookCommand(commandText: string, raw: string): ActionCommand | null {
  const runMatch = commandText.match(/^run\s+(.+)$/i);
  if (!runMatch) {
    return null;
  }

  const name = asNonEmpty(runMatch[1]);
  if (!name) {
    return null;
  }

  return {
    tool: 'runbook_execute',
    args: { name },
    raw,
  };
}

function parseMentionCommand(trimmedInput: string): ActionCommand | null {
  const mentionMatch = trimmedInput.match(/^@(browser|terminal|vscode|runbook)\s+(.+)$/i);
  if (!mentionMatch) {
    return null;
  }

  const target = mentionMatch[1].toLowerCase();
  const commandText = mentionMatch[2].trim();

  if (target === 'browser') {
    return parseBrowserCommand(commandText, trimmedInput);
  }

  if (target === 'terminal') {
    return parseTerminalCommand(commandText, trimmedInput);
  }

  if (target === 'vscode') {
    return parseVSCodeCommand(commandText, trimmedInput);
  }

  if (target === 'runbook') {
    return parseRunbookCommand(commandText, trimmedInput);
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
  mcpClient: { callTool: (name: string, args: Record<string, unknown>) => Promise<any> },
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
