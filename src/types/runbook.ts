/**
 * Supported visibility levels for runbooks.
 */
export type RunbookVisibility = 'personal' | 'enterprise' | 'public';

/**
 * Top-level runbook manifest metadata.
 */
export interface RunbookManifest {
  /**
   * Human-readable runbook name.
   */
  name: string;

  /**
   * Semantic version of the runbook definition.
   */
  version: string;

  /**
   * Runbook author or owning team.
   */
  author: string;

  /**
   * Short description of the runbook intent.
   */
  description: string;

  /**
   * Classifying tags for search and grouping.
   */
  tags: string[];

  /**
   * Publication scope for this runbook.
   */
  visibility: RunbookVisibility;
}

/**
 * Supported variable primitive and special types.
 */
export type RunbookVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'secret'
  | 'selector';

/**
 * Variable source can be:
 * - a Key Vault style path (`vault://...`)
 * - prompt (runtime user input)
 * - env (process environment)
 * - literal (inline value)
 */
export type RunbookVariableSource = `vault://${string}` | 'prompt' | 'env' | 'literal';

/**
 * Allowed default values for runbook variables.
 */
export type RunbookVariableDefaultValue = string | number | boolean | null;

/**
 * Variable declaration used by a runbook.
 */
export interface RunbookVariable {
  /**
   * Unique variable name.
   */
  name: string;

  /**
   * Declared variable type.
   */
  type: RunbookVariableType;

  /**
   * Where the variable value is sourced from.
   */
  source: RunbookVariableSource;

  /**
   * Optional default value used when no runtime value is supplied.
   */
  defaultValue?: RunbookVariableDefaultValue;

  /**
   * Description shown to users/editors.
   */
  description?: string;
}

/**
 * Supported tools for runbook step execution.
 */
export type RunbookStepTool =
  | 'browser.navigate'
  | 'browser.click'
  | 'browser.fill'
  | 'browser.extract'
  | 'browser.screenshot'
  | 'shell.exec'
  | 'mcp.invoke'
  | 'keyvault.resolve';

/**
 * Validation rule for a completed step.
 */
export interface RunbookStepValidation {
  /**
   * Selector used to locate the target value or element.
   */
  selector: string;

  /**
   * Expected value to compare against actual output.
   */
  expected: unknown;
}

/**
 * Error handling strategy for a step.
 */
export type RunbookStepOnError =
  | {
      /**
       * Skip this step and continue with the next one.
       */
      action: 'skip';
    }
  | {
      /**
       * Abort the entire runbook execution.
       */
      action: 'abort';
    }
  | {
      /**
       * Retry this step up to `count` times.
       */
      action: 'retry';

      /**
       * Number of retries before failing.
       */
      count: number;
    };

/**
 * Condition for conditional step execution.
 * Evaluated against a prior step's result status.
 */
export interface StepCondition {
  /**
   * Step ID whose result to evaluate.
   */
  ref: string;

  /**
   * Required status for the referenced step.
   */
  status: StepResultStatus;
}

/**
 * Single executable step in a runbook.
 */
export interface RunbookStep {
  /**
   * Unique step identifier.
   */
  id: string;

  /**
   * Tool operation to invoke for this step.
   */
  tool: RunbookStepTool;

  /**
   * Tool-specific argument payload.
   */
  args: Record<string, unknown>;

  /**
   * Optional post-step validation.
   */
  validate?: RunbookStepValidation;

  /**
   * Optional error policy for this step.
   */
  onError?: RunbookStepOnError;

  /**
   * Optional timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Human-readable description of what the step does.
   */
  description?: string;

  /**
   * IDs of steps this step depends on (DAG edges).
   * If omitted, the step depends on sequential order.
   */
  dependsOn?: string[];

  /**
   * Capture step output into a named variable for downstream steps.
   */
  captureAs?: string;

  /**
   * Conditional execution: step runs only if the referenced step
   * reached the required status.
   */
  condition?: StepCondition;
}

/**
 * Conditions controlling runbook chaining.
 */
export type RunbookChainCondition = 'always' | 'on-success' | 'on-failure';

/**
 * Chain configuration to trigger another runbook.
 */
export interface RunbookChain {
  /**
   * Name of the next runbook to execute.
   */
  nextRunbook: string;

  /**
   * Condition under which chaining should occur.
   */
  condition: RunbookChainCondition;
}

/**
 * Execution status values for a runbook instance.
 */
export type RunbookExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Step result status values.
 */
export type StepResultStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Runtime output of an individual step.
 */
export interface StepResult {
  /**
   * Identifier of the step that produced this result.
   */
  stepId: string;

  /**
   * Final or current status of this step execution.
   */
  status: StepResultStatus;

  /**
   * Tool output payload.
   */
  output?: unknown;

  /**
   * Error details when step fails.
   */
  error?: string;

  /**
   * Step execution duration in milliseconds.
   */
  duration: number;
}

/**
 * Runtime execution state for a runbook run.
 */
export interface RunbookExecution {
  /**
   * Current overall execution state.
   */
  status: RunbookExecutionStatus;

  /**
   * The currently running step id (or null if none).
   */
  currentStep: string | null;

  /**
   * Start timestamp in ISO-8601 format.
   */
  startedAt?: string;

  /**
   * Completion timestamp in ISO-8601 format.
   */
  completedAt?: string;

  /**
   * Collected per-step execution results.
   */
  stepResults: StepResult[];
}
