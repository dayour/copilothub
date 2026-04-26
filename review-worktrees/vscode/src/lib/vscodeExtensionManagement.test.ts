import { describe, expect, it } from 'vitest';

import {
  filterVsCodeExtensions,
  formatVsCodeExtensionContributionSummary,
  getVsCodeExtensionRuntimeSummary,
} from './vscodeExtensionManagement';
import type { VsCodeLocalExtension } from './vscodeExtensions';

function createExtension(overrides: Partial<VsCodeLocalExtension> = {}): VsCodeLocalExtension {
  return {
    id: 'darbotlabs.copilothub-tools',
    name: 'copilothub-tools',
    publisher: 'darbotlabs',
    version: '0.1.0',
    displayName: 'CopilotHub Tools',
    description: 'Commands for CopilotHub.',
    path: 'E:\\copilothub\\.copilothub\\extensions\\copilothub-tools',
    manifestPath: 'E:\\copilothub\\.copilothub\\extensions\\copilothub-tools\\package.json',
    readmePath: null,
    categories: ['Other'],
    keywords: ['copilothub'],
    extensionKind: ['workspace'],
    activationEvents: ['onStartupFinished'],
    entryPoints: {
      main: './dist/extension.js',
      browser: null,
    },
    contributes: {
      commands: 3,
      languages: 0,
      debuggers: 0,
      views: 1,
    },
    warnings: [],
    ...overrides,
  };
}

describe('vscodeExtensionManagement', () => {
  it('filters local extensions by multiple search terms', () => {
    const results = filterVsCodeExtensions(
      [
        createExtension(),
        createExtension({
          id: 'darbotlabs.theme-pack',
          name: 'theme-pack',
          displayName: 'Theme Pack',
          description: 'Color themes for CopilotHub.',
          keywords: ['theme', 'colors'],
        }),
      ],
      'theme colors',
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('darbotlabs.theme-pack');
  });

  it('marks runtime entry points as staged when execution is not available', () => {
    const summary = getVsCodeExtensionRuntimeSummary(createExtension(), {
      canExecuteExtensions: false,
    });

    expect(summary.state).toBe('staged');
    expect(summary.label).toBe('Staged');
  });

  it('marks warning-bearing extensions as needing attention', () => {
    const summary = getVsCodeExtensionRuntimeSummary(
      createExtension({
        warnings: ['Missing browser bundle.'],
      }),
      {
        canExecuteExtensions: true,
      },
    );

    expect(summary.state).toBe('attention-required');
    expect(summary.description).toContain('Missing browser bundle');
  });

  it('formats contribution summaries for discovered metadata', () => {
    expect(formatVsCodeExtensionContributionSummary(createExtension())).toBe('3 commands, 1 view');

    expect(
      formatVsCodeExtensionContributionSummary(
        createExtension({
          contributes: {
            commands: 0,
            languages: 0,
            debuggers: 0,
            views: 0,
          },
        }),
      ),
    ).toBe('No declared contributions');
  });
});
