import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseRunbook, resolveVariableReferences } from './runbookParser';

describe('runbookParser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a complete valid runbook YAML', () => {
    const yaml = `
manifest:
  name: checkout-flow
  version: 1.2.3
  author: QA Team
  description: End-to-end checkout smoke runbook
  tags: [smoke, checkout]
  visibility: enterprise
variables:
  - name: baseUrl
    type: string
    source: literal
    defaultValue: https://example.com
    description: Target URL
  - name: shouldCapture
    type: boolean
    source: literal
    defaultValue: true
steps:
  - id: open-page
    tool: browser.navigate
    args:
      url: \${baseUrl}
  - id: capture
    tool: browser.screenshot
    args:
      fullPage: true
chain:
  nextRunbook: post-check
  condition: on-success
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.runbook).toBeDefined();
    expect(result.runbook?.manifest).toEqual({
      name: 'checkout-flow',
      version: '1.2.3',
      author: 'QA Team',
      description: 'End-to-end checkout smoke runbook',
      tags: ['smoke', 'checkout'],
      visibility: 'enterprise',
    });
    expect(result.runbook?.variables).toHaveLength(2);
    expect(result.runbook?.steps).toHaveLength(2);
    expect(result.runbook?.steps[0].id).toBe('open-page');
    expect(result.runbook?.steps[0].tool).toBe('browser.navigate');
    expect(result.runbook?.chain).toEqual({
      nextRunbook: 'post-check',
      condition: 'on-success',
    });
  });

  it('returns error when manifest name is missing', () => {
    const yaml = `
manifest:
  version: 1.0.0
  author: Team
  description: desc
  tags: []
  visibility: personal
variables: []
steps: []
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'manifest.name',
          message: expect.stringContaining('name is required'),
        }),
      ]),
    );
  });

  it('returns error when step tool is missing', () => {
    const yaml = `
manifest:
  name: r1
  version: 1.0.0
  author: Team
  description: desc
  tags: []
  visibility: personal
variables: []
steps:
  - id: s1
    args:
      url: https://example.com
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(false);
    expect(result.errors.some((error) => error.field === 'steps[0].tool')).toBe(true);
  });

  it('returns error when step tool is invalid', () => {
    const yaml = `
manifest:
  name: r1
  version: 1.0.0
  author: Team
  description: desc
  tags: []
  visibility: personal
variables: []
steps:
  - id: s1
    tool: browser.invalid
    args:
      url: https://example.com
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'steps[0].tool',
          message: expect.stringContaining('tool must be one of'),
        }),
      ]),
    );
  });

  it('returns error when duplicate step IDs are present', () => {
    const yaml = `
manifest:
  name: r1
  version: 1.0.0
  author: Team
  description: desc
  tags: []
  visibility: personal
variables: []
steps:
  - id: same
    tool: browser.navigate
    args:
      url: https://example.com
  - id: same
    tool: browser.click
    args:
      selector: .btn
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'steps[1].id',
          message: expect.stringContaining('duplicate step id "same"'),
        }),
      ]),
    );
  });

  it('returns error when variable name is missing', () => {
    const yaml = `
manifest:
  name: r1
  version: 1.0.0
  author: Team
  description: desc
  tags: []
  visibility: personal
variables:
  - type: string
    source: literal
    defaultValue: value
steps: []
`;

    const result = parseRunbook(yaml);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'variables[0].name',
          message: expect.stringContaining('name is required'),
        }),
      ]),
    );
  });

  it('resolveVariableReferences replaces known variables and leaves unknown as-is', () => {
    const resolved = resolveVariableReferences('Navigate to ${baseUrl} then ${unknown}.', {
      baseUrl: 'https://example.com',
    });

    expect(resolved).toBe('Navigate to https://example.com then ${unknown}.');
  });

  it('returns root error for empty YAML', () => {
    const result = parseRunbook('');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          field: 'root',
          message: 'Runbook root must be an object',
        },
      ]),
    );
  });

  it('returns yaml error for malformed YAML syntax', () => {
    const malformedYaml = 'manifest: [unclosed';
    const result = parseRunbook(malformedYaml);

    expect(result.success).toBe(false);
    expect(result.errors[0]?.field).toBe('yaml');
    expect(result.errors[0]?.message).toBeTruthy();
  });

  it('handles step with empty args object', () => {
    const yaml = `
manifest:
  name: Test
  version: "1.0"
  author: Test
  description: Test
  tags: []
  visibility: personal
variables: []
steps:
  - id: s1
    tool: browser.screenshot
    args: {}
`;
    const result = parseRunbook(yaml);
    expect(result.success).toBe(true);
  });

  it('handles very long step list', () => {
    let stepsYaml = '';
    for (let i = 0; i < 50; i++) {
      stepsYaml += `  - id: step-${i}\n    tool: browser.screenshot\n    args: {}\n`;
    }
    const yaml =
      `manifest:\n  name: Test\n  version: "1.0"\n  author: Test\n  description: Test\n  tags: []\n  visibility: personal\nvariables: []\nsteps:\n${stepsYaml}`;
    const result = parseRunbook(yaml);
    expect(result.success).toBe(true);
    expect(result.runbook!.steps.length).toBe(50);
  });
});
