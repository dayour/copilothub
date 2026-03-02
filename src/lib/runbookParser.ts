import YAML from 'yaml';

import {
  RunbookChain,
  RunbookChainCondition,
  RunbookManifest,
  RunbookStep,
  RunbookStepOnError,
  RunbookStepTool,
  RunbookVariable,
  RunbookVariableSource,
  RunbookVariableType,
} from '../types/runbook';

export interface ParsedRunbook {
  manifest: RunbookManifest;
  variables: RunbookVariable[];
  steps: RunbookStep[];
  chain: RunbookChain | null;
}

export interface ParseError {
  field: string;
  message: string;
}

export type ParseResult = {
  success: boolean;
  runbook?: ParsedRunbook;
  errors: ParseError[];
};

const VALID_STEP_TOOLS: ReadonlySet<RunbookStepTool> = new Set<RunbookStepTool>([
  'browser.navigate',
  'browser.click',
  'browser.fill',
  'browser.extract',
  'browser.screenshot',
  'shell.exec',
  'mcp.invoke',
  'keyvault.resolve',
]);

const VALID_VARIABLE_TYPES: ReadonlySet<RunbookVariableType> = new Set<RunbookVariableType>([
  'string',
  'number',
  'boolean',
  'secret',
  'selector',
]);

const VALID_CHAIN_CONDITIONS: ReadonlySet<RunbookChainCondition> = new Set<RunbookChainCondition>([
  'always',
  'on-success',
  'on-failure',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRunbookVariableSource(value: unknown): value is RunbookVariableSource {
  return value === 'prompt' || value === 'env' || value === 'literal' || (typeof value === 'string' && value.startsWith('vault://'));
}

function isRunbookStepOnError(value: unknown): value is RunbookStepOnError {
  if (!isRecord(value) || !isNonEmptyString(value.action)) {
    return false;
  }

  if (value.action === 'skip' || value.action === 'abort') {
    return true;
  }

  if (value.action === 'retry') {
    return typeof value.count === 'number' && Number.isInteger(value.count) && value.count > 0;
  }

  return false;
}

function validateChain(raw: unknown): { valid: boolean; errors: ParseError[] } {
  const errors: ParseError[] = [];
  if (raw === undefined || raw === null) {
    return { valid: true, errors };
  }

  if (!isRecord(raw)) {
    return { valid: false, errors: [{ field: 'chain', message: 'chain must be an object' }] };
  }

  if (!isNonEmptyString(raw.nextRunbook)) {
    errors.push({ field: 'chain.nextRunbook', message: 'nextRunbook is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.condition) || !VALID_CHAIN_CONDITIONS.has(raw.condition as RunbookChainCondition)) {
    errors.push({ field: 'chain.condition', message: 'condition must be one of: always, on-success, on-failure' });
  }

  return { valid: errors.length === 0, errors };
}

export function validateManifest(raw: unknown): { valid: boolean; errors: ParseError[] } {
  const errors: ParseError[] = [];
  if (!isRecord(raw)) {
    return { valid: false, errors: [{ field: 'manifest', message: 'manifest must be an object' }] };
  }

  if (!isNonEmptyString(raw.name)) {
    errors.push({ field: 'manifest.name', message: 'name is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.version)) {
    errors.push({ field: 'manifest.version', message: 'version is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.author)) {
    errors.push({ field: 'manifest.author', message: 'author is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.description)) {
    errors.push({ field: 'manifest.description', message: 'description is required and must be a non-empty string' });
  }

  if (!Array.isArray(raw.tags) || !raw.tags.every((tag) => typeof tag === 'string')) {
    errors.push({ field: 'manifest.tags', message: 'tags must be an array of strings' });
  }

  if (raw.visibility !== 'personal' && raw.visibility !== 'enterprise' && raw.visibility !== 'public') {
    errors.push({ field: 'manifest.visibility', message: 'visibility must be one of: personal, enterprise, public' });
  }

  return { valid: errors.length === 0, errors };
}

export function validateStep(raw: unknown, index: number): { valid: boolean; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const prefix = `steps[${index}]`;

  if (!isRecord(raw)) {
    return { valid: false, errors: [{ field: prefix, message: 'step must be an object' }] };
  }

  if (!isNonEmptyString(raw.id)) {
    errors.push({ field: `${prefix}.id`, message: 'id is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.tool) || !VALID_STEP_TOOLS.has(raw.tool as RunbookStepTool)) {
    errors.push({ field: `${prefix}.tool`, message: `tool must be one of: ${Array.from(VALID_STEP_TOOLS).join(', ')}` });
  }

  if (!isRecord(raw.args)) {
    errors.push({ field: `${prefix}.args`, message: 'args is required and must be an object' });
  }

  if (raw.validate !== undefined) {
    if (!isRecord(raw.validate)) {
      errors.push({ field: `${prefix}.validate`, message: 'validate must be an object when provided' });
    } else {
      if (!isNonEmptyString(raw.validate.selector)) {
        errors.push({ field: `${prefix}.validate.selector`, message: 'selector must be a non-empty string' });
      }
      if (!Object.prototype.hasOwnProperty.call(raw.validate, 'expected')) {
        errors.push({ field: `${prefix}.validate.expected`, message: 'expected is required when validate is provided' });
      }
    }
  }

  if (raw.onError !== undefined && !isRunbookStepOnError(raw.onError)) {
    errors.push({ field: `${prefix}.onError`, message: 'onError must be skip, abort, or retry with positive count' });
  }

  if (raw.timeout !== undefined && (typeof raw.timeout !== 'number' || !Number.isFinite(raw.timeout) || raw.timeout <= 0)) {
    errors.push({ field: `${prefix}.timeout`, message: 'timeout must be a positive number when provided' });
  }

  if (raw.description !== undefined && typeof raw.description !== 'string') {
    errors.push({ field: `${prefix}.description`, message: 'description must be a string when provided' });
  }

  return { valid: errors.length === 0, errors };
}

export function validateVariable(raw: unknown, index: number): { valid: boolean; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const prefix = `variables[${index}]`;

  if (!isRecord(raw)) {
    return { valid: false, errors: [{ field: prefix, message: 'variable must be an object' }] };
  }

  if (!isNonEmptyString(raw.name)) {
    errors.push({ field: `${prefix}.name`, message: 'name is required and must be a non-empty string' });
  }

  if (!isNonEmptyString(raw.type) || !VALID_VARIABLE_TYPES.has(raw.type as RunbookVariableType)) {
    errors.push({ field: `${prefix}.type`, message: 'type must be one of: string, number, boolean, secret, selector' });
  }

  if (!isRunbookVariableSource(raw.source)) {
    errors.push({ field: `${prefix}.source`, message: 'source must be prompt, env, literal, or vault://<path>' });
  }

  if (
    raw.defaultValue !== undefined &&
    raw.defaultValue !== null &&
    typeof raw.defaultValue !== 'string' &&
    typeof raw.defaultValue !== 'number' &&
    typeof raw.defaultValue !== 'boolean'
  ) {
    errors.push({ field: `${prefix}.defaultValue`, message: 'defaultValue must be string, number, boolean, or null' });
  }

  if (raw.description !== undefined && typeof raw.description !== 'string') {
    errors.push({ field: `${prefix}.description`, message: 'description must be a string when provided' });
  }

  return { valid: errors.length === 0, errors };
}

export function parseRunbook(yamlContent: string): ParseResult {
  const errors: ParseError[] = [];
  let parsed: unknown;

  try {
    parsed = YAML.parse(yamlContent);
  } catch (error) {
    return {
      success: false,
      errors: [{ field: 'yaml', message: error instanceof Error ? error.message : 'Invalid YAML content' }],
    };
  }

  if (!isRecord(parsed)) {
    return {
      success: false,
      errors: [{ field: 'root', message: 'Runbook root must be an object' }],
    };
  }

  const manifestValidation = validateManifest(parsed.manifest);
  errors.push(...manifestValidation.errors);

  if (!Array.isArray(parsed.variables)) {
    errors.push({ field: 'variables', message: 'variables must be an array' });
  } else {
    parsed.variables.forEach((variable, index) => {
      const result = validateVariable(variable, index);
      errors.push(...result.errors);
    });
  }

  if (!Array.isArray(parsed.steps)) {
    errors.push({ field: 'steps', message: 'steps must be an array' });
  } else {
    const seenStepIds = new Set<string>();
    parsed.steps.forEach((step, index) => {
      const result = validateStep(step, index);
      errors.push(...result.errors);

      if (isRecord(step) && isNonEmptyString(step.id)) {
        if (seenStepIds.has(step.id)) {
          errors.push({
            field: `steps[${index}].id`,
            message: `duplicate step id "${step.id}" is not allowed`,
          });
        } else {
          seenStepIds.add(step.id);
        }
      }
    });
  }

  const chainValidation = validateChain(parsed.chain);
  errors.push(...chainValidation.errors);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const runbook: ParsedRunbook = {
    manifest: parsed.manifest as RunbookManifest,
    variables: (parsed.variables as RunbookVariable[]) ?? [],
    steps: (parsed.steps as RunbookStep[]) ?? [],
    chain: (parsed.chain as RunbookChain | null) ?? null,
  };

  return {
    success: true,
    runbook,
    errors: [],
  };
}

export function resolveVariableReferences(text: string, variables: Record<string, string>): string {
  return text.replace(/\$\{([A-Za-z0-9_.-]+)\}/g, (match, variableName: string) => {
    return Object.prototype.hasOwnProperty.call(variables, variableName) ? variables[variableName] : match;
  });
}

export function detectChainCycles(runbooks: Map<string, ParsedRunbook>): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  const dfs = (runbookName: string): void => {
    visited.add(runbookName);
    stack.add(runbookName);
    path.push(runbookName);

    const runbook = runbooks.get(runbookName);
    const next = runbook?.chain?.nextRunbook;

    if (next && runbooks.has(next)) {
      if (!visited.has(next)) {
        dfs(next);
      } else if (stack.has(next)) {
        const cycleStart = path.indexOf(next);
        if (cycleStart >= 0) {
          const cyclePath = [...path.slice(cycleStart), next].join(' -> ');
          cycles.push(cyclePath);
        }
      }
    }

    path.pop();
    stack.delete(runbookName);
  };

  for (const runbookName of runbooks.keys()) {
    if (!visited.has(runbookName)) {
      dfs(runbookName);
    }
  }

  return cycles;
}
