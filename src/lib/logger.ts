// Structured logging for CopilotHub.
// Replaces scattered console.log calls with consistent format.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  const prefix = `[CopilotHub:${context}]`;
  const args: unknown[] = [prefix, message];
  if (data !== undefined) args.push(data);

  switch (level) {
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
    case 'debug':
      console.debug(...args);
      break;
  }
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => log('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) => log('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) => log('error', context, message, data),
  debug: (context: string, message: string, data?: unknown) => log('debug', context, message, data),
};
