import { describe, expect, it } from 'vitest';

import {
  buildCompactClippyCard,
  buildTerminalSummaryCard,
  createClippyDemoVm,
  listClippyCardPresetIds,
  type ClippyTerminalSurfaceVm,
} from './clippyCards';

function createVm(overrides: Partial<ClippyTerminalSurfaceVm> = {}): ClippyTerminalSurfaceVm {
  const base = createClippyDemoVm('terminal-ready');
  return {
    ...base,
    ...overrides,
    hostTabs: overrides.hostTabs ?? base.hostTabs,
    terminal: overrides.terminal ?? base.terminal,
    sessions: overrides.sessions ?? base.sessions,
    artifacts: overrides.artifacts ?? base.artifacts,
    highlights: overrides.highlights ?? base.highlights,
    actions: overrides.actions ?? base.actions,
  };
}

describe('clippyCards', () => {
  it('builds a terminal summary card with explicit summary sections and actions', () => {
    const vm = createVm({
      activeTabId: 'sessions',
      hostTabs: [
        { id: 'terminal', label: 'Terminal', description: 'Interactive shell', itemCount: 1 },
        { id: 'sessions', label: 'Sessions', description: 'Saved sessions', itemCount: 3 },
        { id: 'artifacts', label: 'Artifacts', description: 'Stored output', itemCount: 2, badge: 'ready' },
      ],
    });

    const card = buildTerminalSummaryCard(vm);

    expect(card.$schema).toBe('http://adaptivecards.io/schemas/adaptive-card.json');
    expect(card.type).toBe('AdaptiveCard');
    expect(card.version).toBe('1.5');
    expect(card.actions).toHaveLength(2);

    const bodyText = JSON.stringify(card.body);
    expect(bodyText).toContain('"Host tabs"');
    expect(bodyText).toContain('Sessions: active | 3 items');
    expect(bodyText).toContain('"Active tab","value":"sessions"');
    expect(bodyText).toContain('Terminal tab owns execution while cards stay summary-only.');

    const firstAction = card.actions?.[0];
    expect(firstAction).toEqual({
      type: 'Action.Submit',
      title: 'Resume terminal',
      style: 'positive',
      data: {
        actionId: 'resume-terminal',
        source: 'clippy-card',
        verb: 'host.switchTab',
        target: 'terminal',
      },
    });
  });

  it('builds a compact card without actions when no actions are available', () => {
    const vm = createVm({
      summary:
        'This summary is intentionally long so the compact Clippy widget payload proves that the summary text is trimmed to a predictable size for narrow widgets and tool trays.',
      actions: [],
    });

    const card = buildCompactClippyCard(vm);

    expect(card.actions).toBeUndefined();
    expect(card.body).toHaveLength(5);

    const summaryBlock = card.body[2];
    expect(summaryBlock).toMatchObject({
      type: 'TextBlock',
    });
    expect(summaryBlock).toHaveProperty('text');
    if (summaryBlock.type !== 'TextBlock') {
      throw new Error('Expected compact summary block to be a TextBlock.');
    }
    expect(summaryBlock.text.endsWith('...')).toBe(true);
    expect(summaryBlock.text.length).toBeLessThanOrEqual(140);
  });

  it('creates isolated demo preset instances', () => {
    const first = createClippyDemoVm('artifact-follow-up');
    const second = createClippyDemoVm('artifact-follow-up');

    first.hostTabs[0].label = 'Mutated';

    expect(second.hostTabs[0].label).toBe('Terminal');
    expect(listClippyCardPresetIds()).toEqual([
      'terminal-ready',
      'terminal-busy',
      'artifact-follow-up',
    ]);
  });

  it('renders empty recents with explicit placeholder copy', () => {
    const vm = createVm({
      sessions: {
        total: 0,
        running: 0,
        idle: 0,
        recent: [],
      },
      artifacts: {
        total: 0,
        ready: 0,
        attention: 0,
        recent: [],
      },
      highlights: [],
      actions: [],
    });

    const card = buildTerminalSummaryCard(vm);
    const bodyText = JSON.stringify(card.body);

    expect(bodyText).toContain('No session activity yet.');
    expect(bodyText).toContain('No artifacts have been captured yet.');
    expect(bodyText).not.toContain('"Highlights"');
    expect(card.actions).toBeUndefined();
  });
});
