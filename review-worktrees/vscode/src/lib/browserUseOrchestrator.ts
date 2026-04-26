// ---------------------------------------------------------------------------
// browserUseOrchestrator.ts -- Plan-Execute-Observe-Refine loop for
// "Browser Use" automation in CopilotHub. Orchestrates multi-step browser
// tasks by creating a plan of MCP tool calls, executing them sequentially,
// observing page state after each step, and refining the plan as needed.
// ---------------------------------------------------------------------------

import mcpClient from './mcpClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrowserUseStepType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'snapshot'
  | 'evaluate'
  | 'observe'
  | 'done'
  | 'error';

export interface BrowserUseStep {
  id: string;
  type: BrowserUseStepType;
  description: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
  observation?: string;
}

export interface BrowserUsePlan {
  goal: string;
  steps: BrowserUseStep[];
  currentStepIndex: number;
  status:
    | 'planning'
    | 'executing'
    | 'observing'
    | 'refining'
    | 'completed'
    | 'failed'
    | 'cancelled';
  maxSteps: number;
  totalStepsExecuted: number;
  observations: string[];
}

export type OrchestratorEventType =
  | 'plan-created'
  | 'step-start'
  | 'step-complete'
  | 'step-failed'
  | 'observation'
  | 'plan-refined'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  plan: BrowserUsePlan;
  step?: BrowserUseStep;
  message: string;
}

export type OrchestratorListener = (event: OrchestratorEvent) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short random ID for plan steps. */
function stepId(): string {
  return `step-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Parse a high-level goal string into a step type and MCP tool invocation.
 * This is a simple heuristic -- the real implementation will use copilot-sdk
 * to generate sophisticated plans from natural-language goals.
 */
function parseGoalToStep(goal: string): Pick<BrowserUseStep, 'type' | 'toolName' | 'toolArgs' | 'description'> {
  const lower = goal.toLowerCase().trim();

  if (lower.startsWith('go to ') || lower.startsWith('navigate to ') || lower.startsWith('open ')) {
    const url = goal.replace(/^(go to|navigate to|open)\s+/i, '').trim();
    return {
      type: 'navigate',
      toolName: 'browser_navigate',
      toolArgs: { url },
      description: `Navigate to ${url}`,
    };
  }

  if (lower.startsWith('click ')) {
    const target = goal.replace(/^click\s+/i, '').trim();
    return {
      type: 'click',
      toolName: 'browser_click',
      toolArgs: { element: target, ref: target },
      description: `Click on "${target}"`,
    };
  }

  if (lower.startsWith('type ') || lower.startsWith('fill ') || lower.startsWith('enter ')) {
    const rest = goal.replace(/^(type|fill|enter)\s+/i, '').trim();
    return {
      type: 'type',
      toolName: 'browser_type',
      toolArgs: { text: rest, ref: '' },
      description: `Type "${rest}"`,
    };
  }

  if (lower.startsWith('scroll')) {
    return {
      type: 'scroll',
      toolName: 'browser_scroll',
      toolArgs: { deltaX: 0, deltaY: 300 },
      description: 'Scroll down the page',
    };
  }

  if (lower.startsWith('screenshot') || lower.startsWith('capture')) {
    return {
      type: 'screenshot',
      toolName: 'browser_take_screenshot',
      toolArgs: { type: 'png' },
      description: 'Take a screenshot of the page',
    };
  }

  if (lower.startsWith('wait')) {
    const seconds = parseInt(goal.replace(/\D/g, ''), 10) || 2;
    return {
      type: 'wait',
      toolName: 'browser_wait_for',
      toolArgs: { time: seconds },
      description: `Wait ${seconds} seconds`,
    };
  }

  if (lower.startsWith('evaluate') || lower.startsWith('run ')) {
    const script = goal.replace(/^(evaluate|run)\s+/i, '').trim();
    return {
      type: 'evaluate',
      toolName: 'browser_evaluate',
      toolArgs: { function: script },
      description: `Evaluate script: ${script.slice(0, 60)}`,
    };
  }

  // Default: treat the entire goal as an observe + snapshot
  return {
    type: 'observe',
    toolName: 'browser_observe',
    toolArgs: {},
    description: goal,
  };
}

// ---------------------------------------------------------------------------
// BrowserUseOrchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates multi-step "Browser Use" automation using the
 * plan → execute → observe → refine loop.
 *
 * Communicates with the MCP sidecar through the shared mcpClient singleton
 * and emits lifecycle events so the UI can render progress in real time.
 */
export class BrowserUseOrchestrator {
  private plan: BrowserUsePlan | null = null;
  private listeners: Set<OrchestratorListener> = new Set();
  private abortController: AbortController | null = null;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Subscribe to orchestrator events. Returns an unsubscribe function.
   */
  on(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start a browser-use session with a high-level goal.
   * Creates an initial plan and begins execution.
   */
  async start(
    goal: string,
    options?: { maxSteps?: number },
  ): Promise<BrowserUsePlan> {
    const maxSteps = options?.maxSteps ?? 20;

    this.abortController = new AbortController();
    this.plan = this.createPlan(goal, maxSteps);

    this.emit('plan-created', `Plan created for goal: "${goal}"`);

    this.plan.status = 'executing';

    try {
      await this.runLoop();
    } catch (err) {
      if ((this.plan.status as string) !== 'cancelled') {
        this.plan.status = 'failed';
        const message =
          err instanceof Error ? err.message : String(err);
        this.emit('failed', `Orchestration failed: ${message}`);
      }
    }

    return this.plan;
  }

  /**
   * Cancel the current execution.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.plan && this.plan.status === 'executing') {
      this.plan.status = 'cancelled';

      // Mark any planned/executing steps as skipped
      for (const step of this.plan.steps) {
        if (step.status === 'planned' || step.status === 'executing') {
          step.status = 'skipped';
        }
      }

      this.emit('cancelled', 'Orchestration cancelled by user');
    }
  }

  /**
   * Get the current plan.
   */
  getPlan(): BrowserUsePlan | null {
    return this.plan;
  }

  // -----------------------------------------------------------------------
  // Plan creation
  // -----------------------------------------------------------------------

  /**
   * Create an initial plan from a goal string.
   *
   * In the future, this will call copilot-sdk to generate steps.
   * For now, creates a simple 3-step plan:
   *   1. observe  -- see current page state
   *   2. goal step -- parsed from the goal string
   *   3. observe  -- see the result
   */
  private createPlan(goal: string, maxSteps: number): BrowserUsePlan {
    const goalStep = parseGoalToStep(goal);

    const steps: BrowserUseStep[] = [
      {
        id: stepId(),
        type: 'observe',
        description: 'Observe current page state before executing goal',
        toolName: 'browser_observe',
        toolArgs: {},
        status: 'planned',
      },
      {
        id: stepId(),
        ...goalStep,
        status: 'planned',
      },
      {
        id: stepId(),
        type: 'observe',
        description: 'Observe page state after executing goal',
        toolName: 'browser_observe',
        toolArgs: {},
        status: 'planned',
      },
    ];

    return {
      goal,
      steps,
      currentStepIndex: 0,
      status: 'planning',
      maxSteps,
      totalStepsExecuted: 0,
      observations: [],
    };
  }

  // -----------------------------------------------------------------------
  // Step execution
  // -----------------------------------------------------------------------

  /**
   * Execute a single step via MCP tools.
   * Updates the step's status and result/error fields in place.
   */
  private async executeStep(step: BrowserUseStep): Promise<void> {
    const result = await mcpClient.callTool(step.toolName, step.toolArgs);

    if (result.success) {
      step.status = 'completed';
      step.result =
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);
    } else {
      step.status = 'failed';
      step.error = result.error ?? 'Unknown error';
    }
  }

  /**
   * Observe current page state by calling browser_observe.
   * Returns the observation text and appends it to plan.observations.
   */
  private async observe(): Promise<string> {
    const result = await mcpClient.callTool('browser_observe', {});

    const observation =
      result.success
        ? typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content)
        : `Observation failed: ${result.error ?? 'unknown'}`;

    if (this.plan) {
      this.plan.observations.push(observation);
    }

    return observation;
  }

  // -----------------------------------------------------------------------
  // Main execution loop
  // -----------------------------------------------------------------------

  /**
   * The main execution loop: execute steps, observe after each, and
   * respect the abort signal and maxSteps guard.
   */
  private async runLoop(): Promise<void> {
    if (!this.plan) return;

    for (let i = 0; i < this.plan.steps.length; i++) {
      // Check abort signal before each step
      if (this.abortController?.signal.aborted) {
        return;
      }

      // Guard against runaway execution
      if (this.plan.totalStepsExecuted >= this.plan.maxSteps) {
        this.plan.status = 'failed';
        this.emit(
          'failed',
          `Reached maximum step limit (${this.plan.maxSteps})`,
        );
        return;
      }

      const step = this.plan.steps[i];
      this.plan.currentStepIndex = i;

      // --- Execute ---
      step.status = 'executing';
      this.emit('step-start', `Executing: ${step.description}`, step);

      await this.executeStep(step);
      this.plan.totalStepsExecuted += 1;

      if ((step.status as string) === 'completed') {
        this.emit('step-complete', `Completed: ${step.description}`, step);
      } else {
        this.emit(
          'step-failed',
          `Failed: ${step.description} — ${step.error ?? 'unknown'}`,
          step,
        );
      }

      // Check abort signal after execution
      if (this.abortController?.signal.aborted) {
        return;
      }

      // --- Observe after each non-observe step ---
      if (step.type !== 'observe') {
        this.plan.status = 'observing';
        const observation = await this.observe();
        step.observation = observation;
        this.emit('observation', observation);
        this.plan.status = 'executing';
      }
    }

    // All steps complete
    if (this.plan.status !== 'cancelled') {
      this.plan.status = 'completed';
      this.emit(
        'completed',
        `Goal "${this.plan.goal}" completed in ${this.plan.totalStepsExecuted} steps`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Event emission
  // -----------------------------------------------------------------------

  /**
   * Emit an event to all listeners.
   */
  private emit(
    type: OrchestratorEventType,
    message: string,
    step?: BrowserUseStep,
  ): void {
    if (!this.plan) return;

    const event: OrchestratorEvent = {
      type,
      plan: this.plan,
      step,
      message,
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to avoid breaking the loop
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton and factory
// ---------------------------------------------------------------------------

/** Default singleton orchestrator for the common single-session case. */
export const browserUseOrchestrator = new BrowserUseOrchestrator();

/** Create a new orchestrator instance (useful for isolated sessions / tests). */
export function createBrowserUseOrchestrator(): BrowserUseOrchestrator {
  return new BrowserUseOrchestrator();
}

export default browserUseOrchestrator;
