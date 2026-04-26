import { ParsedRunbook, resolveVariableReferences } from './runbookParser';
import {
  RunbookExecution,
  RunbookStep,
  RunbookStepValidation,
  RunbookVariable,
  StepCondition,
  StepResult,
  StepResultStatus,
} from '../types/runbook';

export type ExecutionEvent = {
  type: 'step-start' | 'step-complete' | 'step-error' | 'runbook-start' | 'runbook-complete' | 'runbook-error';
  stepId?: string;
  data?: unknown;
  timestamp: number;
};

export type ExecutionOptions = {
  onEvent?: (event: ExecutionEvent) => void;
  abortSignal?: AbortSignal;
  variableOverrides?: Record<string, string>;
};

type ToolCallResult = { success: boolean; content: unknown; error?: string };
type McpCallTool = (name: string, args: Record<string, unknown>) => Promise<ToolCallResult>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createStepResult(stepId: string, status: StepResultStatus, duration: number, output?: unknown, error?: string): StepResult {
  return { stepId, status, duration, output, error };
}

export function resolveArgsWithVariables(input: unknown, variables: Record<string, string>): unknown {
  if (typeof input === 'string') {
    return resolveVariableReferences(input, variables);
  }

  if (Array.isArray(input)) {
    return input.map((value) => resolveArgsWithVariables(value, variables));
  }

  if (isRecord(input)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      resolved[key] = resolveArgsWithVariables(value, variables);
    }
    return resolved;
  }

  return input;
}

function extractBySelector(content: unknown, selector: string): unknown {
  if (!selector || selector === '$' || selector === '.') {
    return content;
  }

  const normalized = selector.startsWith('$.') ? selector.slice(2) : selector.startsWith('.') ? selector.slice(1) : selector;
  const parts = normalized.split('.').filter((part) => part.length > 0);
  let current: unknown = content;

  for (const part of parts) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    current = current[part];
  }

  return current;
}

export function validateStepResult(output: unknown, validation: RunbookStepValidation): { valid: boolean; actual: unknown } {
  const actual = extractBySelector(output, validation.selector);
  return { valid: Object.is(actual, validation.expected), actual };
}

async function callWithTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Step timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Runbook execution aborted');
  }
}

function normalizeVariableValue(variable: RunbookVariable, value: unknown): string {
  if (value === undefined || value === null) {
    throw new Error(`Variable "${variable.name}" resolved to empty value`);
  }

  switch (variable.type) {
    case 'number': {
      const parsed = typeof value === 'number' ? value : Number(String(value));
      if (!Number.isFinite(parsed)) {
        throw new Error(`Variable "${variable.name}" must be a valid number`);
      }
      return String(parsed);
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      const normalized = String(value).trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return 'true';
      }
      if (normalized === 'false' || normalized === '0') {
        return 'false';
      }
      throw new Error(`Variable "${variable.name}" must be a boolean (true/false)`);
    }
    case 'string':
    case 'secret':
    case 'selector':
      return String(value);
    default:
      return String(value);
  }
}

function readProcessEnv(variableName: string): string | undefined {
  const candidate = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return candidate.process?.env?.[variableName];
}

async function resolveVariable(
  variable: RunbookVariable,
  overrides: Record<string, string>,
  mcpCallTool: McpCallTool,
): Promise<string> {
  if (Object.prototype.hasOwnProperty.call(overrides, variable.name)) {
    return normalizeVariableValue(variable, overrides[variable.name]);
  }

  if (variable.source === 'literal') {
    if (variable.defaultValue === undefined) {
      throw new Error(`Variable "${variable.name}" has source "literal" but no defaultValue`);
    }
    return normalizeVariableValue(variable, variable.defaultValue);
  }

  if (variable.source === 'env') {
    const envValue = readProcessEnv(variable.name);
    if (envValue !== undefined) {
      return normalizeVariableValue(variable, envValue);
    }
    if (variable.defaultValue !== undefined) {
      return normalizeVariableValue(variable, variable.defaultValue);
    }
    throw new Error(`Environment variable "${variable.name}" was not found`);
  }

  if (variable.source === 'prompt') {
    if (typeof globalThis.prompt === 'function') {
      const promptResult = globalThis.prompt(variable.description ?? `Enter value for ${variable.name}`) ?? '';
      if (promptResult !== '') {
        return normalizeVariableValue(variable, promptResult);
      }
    }
    if (variable.defaultValue !== undefined) {
      return normalizeVariableValue(variable, variable.defaultValue);
    }
    throw new Error(
      `Variable "${variable.name}" requires prompt input. Provide it via variableOverrides in non-interactive execution.`,
    );
  }

  if (variable.source.startsWith('vault://')) {
    const result = await mcpCallTool('keyvault.resolve', { path: variable.source });
    if (!result.success) {
      throw new Error(result.error ?? `Failed to resolve vault secret for "${variable.name}"`);
    }

    if (typeof result.content === 'string') {
      return normalizeVariableValue(variable, result.content);
    }

    if (isRecord(result.content) && typeof result.content.value === 'string') {
      return normalizeVariableValue(variable, result.content.value);
    }

    throw new Error(`Invalid keyvault.resolve response for variable "${variable.name}"`);
  }

  throw new Error(`Unsupported variable source for "${variable.name}"`);
}

// --- DAG helpers ---

/**
 * Determine if any step uses dependsOn, signaling DAG execution mode.
 */
function hasDagDependencies(steps: RunbookStep[]): boolean {
  return steps.some((s) => Array.isArray(s.dependsOn));
}

/**
 * Evaluate a step condition against completed results.
 * Returns true if the step should execute, false if it should be skipped.
 */
function evaluateCondition(condition: StepCondition, resultMap: Map<string, StepResult>): boolean {
  const refResult = resultMap.get(condition.ref);
  if (!refResult) return false;
  return refResult.status === condition.status;
}

/**
 * Stringify captured output for injection into the variables map.
 */
function stringifyCapture(output: unknown): string {
  if (output === undefined || output === null) return '';
  if (typeof output === 'string') return output;
  return JSON.stringify(output);
}

export class RunbookExecutor {
  private readonly mcpCallTool: McpCallTool;

  public constructor(mcpCallTool: McpCallTool) {
    this.mcpCallTool = mcpCallTool;
  }

  /**
   * Execute a single step with retry/skip/abort semantics.
   * Returns the StepResult and emits lifecycle events.
   */
  private async executeStep(
    step: RunbookStep,
    variables: Record<string, string>,
    emit: (event: ExecutionEvent) => void,
    signal?: AbortSignal,
  ): Promise<StepResult> {
    const stepStartTime = Date.now();

    emit({
      type: 'step-start',
      stepId: step.id,
      data: { tool: step.tool, description: step.description },
      timestamp: stepStartTime,
    });

    const maxAttempts = step.onError?.action === 'retry' ? step.onError.count + 1 : 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        assertNotAborted(signal);
        const resolvedArgs = resolveArgsWithVariables(step.args, variables);
        const toolResult = await callWithTimeout(
          this.mcpCallTool(step.tool, resolvedArgs as Record<string, unknown>),
          step.timeout,
        );

        if (!toolResult.success) {
          throw new Error(toolResult.error ?? `Tool "${step.tool}" returned unsuccessful result`);
        }

        if (step.validate) {
          const validation = validateStepResult(toolResult.content, step.validate);
          if (!validation.valid) {
            throw new Error(
              `Validation failed for step "${step.id}" at selector "${step.validate.selector}". Expected ${JSON.stringify(
                step.validate.expected,
              )}, got ${JSON.stringify(validation.actual)}`,
            );
          }
        }

        const duration = Date.now() - stepStartTime;
        const result = createStepResult(step.id, 'completed', duration, toolResult.content);

        emit({
          type: 'step-complete',
          stepId: step.id,
          data: { attempt, duration, output: toolResult.content },
          timestamp: Date.now(),
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown step execution error';
        const canRetry = step.onError?.action === 'retry' && attempt < maxAttempts;

        emit({
          type: 'step-error',
          stepId: step.id,
          data: { attempt, error: errorMessage, canRetry },
          timestamp: Date.now(),
        });

        if (canRetry) {
          continue;
        }

        const duration = Date.now() - stepStartTime;
        if (step.onError?.action === 'skip') {
          return createStepResult(step.id, 'skipped', duration, undefined, errorMessage);
        }

        // Fatal: return failed result. Caller decides whether to abort.
        return createStepResult(step.id, 'failed', duration, undefined, errorMessage);
      }
    }

    // Should never reach here, but guard.
    const duration = Date.now() - stepStartTime;
    return createStepResult(step.id, 'failed', duration, undefined, 'Exhausted all attempts');
  }

  public async execute(runbook: ParsedRunbook, options: ExecutionOptions = {}): Promise<RunbookExecution> {
    const execution: RunbookExecution = {
      status: 'running',
      currentStep: null,
      startedAt: new Date().toISOString(),
      stepResults: [],
    };

    const emit = (event: ExecutionEvent): void => {
      options.onEvent?.(event);
    };

    emit({
      type: 'runbook-start',
      data: { runbook: runbook.manifest.name },
      timestamp: Date.now(),
    });

    try {
      assertNotAborted(options.abortSignal);

      const variables: Record<string, string> = {};
      const overrides = options.variableOverrides ?? {};

      for (const variable of runbook.variables) {
        assertNotAborted(options.abortSignal);
        variables[variable.name] = await resolveVariable(variable, overrides, this.mcpCallTool);
      }

      if (hasDagDependencies(runbook.steps)) {
        await this.executeDag(runbook.steps, variables, execution, emit, options.abortSignal);
      } else {
        await this.executeSequential(runbook.steps, variables, execution, emit, options.abortSignal);
      }

      if (execution.status !== 'failed') {
        execution.status = 'completed';
      }
      execution.currentStep = null;
      execution.completedAt = new Date().toISOString();

      emit({
        type: 'runbook-complete',
        data: { status: execution.status, steps: execution.stepResults.length },
        timestamp: Date.now(),
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date().toISOString();
      const runbookError = error instanceof Error ? error.message : 'Unknown runbook execution error';

      emit({
        type: 'runbook-error',
        stepId: execution.currentStep ?? undefined,
        data: { error: runbookError },
        timestamp: Date.now(),
      });

      execution.currentStep = null;
      return execution;
    }
  }

  /**
   * Original sequential execution path (backward compatible).
   */
  private async executeSequential(
    steps: RunbookStep[],
    variables: Record<string, string>,
    execution: RunbookExecution,
    emit: (event: ExecutionEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const resultMap = new Map<string, StepResult>();

    for (const step of steps) {
      assertNotAborted(signal);
      execution.currentStep = step.id;

      // Condition check
      if (step.condition) {
        if (!evaluateCondition(step.condition, resultMap)) {
          const skipResult = createStepResult(step.id, 'skipped', 0, undefined, 'Condition not met');
          execution.stepResults.push(skipResult);
          resultMap.set(step.id, skipResult);
          continue;
        }
      }

      const result = await this.executeStep(step, variables, emit, signal);
      execution.stepResults.push(result);
      resultMap.set(step.id, result);

      // Capture output into variables
      if (step.captureAs && result.status === 'completed' && result.output !== undefined) {
        variables[step.captureAs] = stringifyCapture(result.output);
      }

      if (result.status === 'failed') {
        throw new Error(`Step "${step.id}" failed: ${result.error}`);
      }
    }
  }

  /**
   * DAG execution: run steps in topological waves, executing
   * independent steps in parallel within each wave.
   */
  private async executeDag(
    steps: RunbookStep[],
    variables: Record<string, string>,
    execution: RunbookExecution,
    emit: (event: ExecutionEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const resultMap = new Map<string, StepResult>();
    const completed = new Set<string>();
    const remaining = new Map<string, RunbookStep>(steps.map((s) => [s.id, s]));
    const stepIndexById = new Map<string, number>(steps.map((step, index) => [step.id, index]));

    const getDependencies = (step: RunbookStep): string[] => {
      if (Array.isArray(step.dependsOn)) {
        return step.dependsOn;
      }

      const index = stepIndexById.get(step.id);
      if (index === undefined || index === 0) {
        return [];
      }

      return [steps[index - 1].id];
    };

    while (remaining.size > 0) {
      assertNotAborted(signal);

      // Find steps whose dependencies are all satisfied.
      const ready: RunbookStep[] = [];
      for (const step of remaining.values()) {
        const deps = getDependencies(step);
        if (deps.every((dep) => completed.has(dep))) {
          ready.push(step);
        }
      }

      if (ready.length === 0) {
        // All remaining steps have unmet deps -- should not happen if
        // cycle detection passed, but guard against it.
        const stuck = Array.from(remaining.keys()).join(', ');
        throw new Error(`DAG deadlock: steps [${stuck}] have unresolvable dependencies`);
      }

      // Execute the ready wave in parallel.
      const waveVariables = { ...variables };
      const wavePromises = ready.map(async (step) => {
        execution.currentStep = step.id;

        // Condition check
        if (step.condition) {
          if (!evaluateCondition(step.condition, resultMap)) {
            return createStepResult(step.id, 'skipped', 0, undefined, 'Condition not met');
          }
        }

        return this.executeStep(step, waveVariables, emit, signal);
      });

      const waveResults = await Promise.all(wavePromises);

      let hasFatalFailure = false;
      for (let i = 0; i < waveResults.length; i++) {
        const result = waveResults[i];
        const step = ready[i];
        execution.stepResults.push(result);
        resultMap.set(step.id, result);
        completed.add(step.id);
        remaining.delete(step.id);

        // Capture output
        if (step.captureAs && result.status === 'completed' && result.output !== undefined) {
          variables[step.captureAs] = stringifyCapture(result.output);
        }

        if (result.status === 'failed') {
          hasFatalFailure = true;
        }
      }

      if (hasFatalFailure) {
        execution.status = 'failed';
        return;
      }
    }
  }
}
