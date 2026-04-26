export type ClippyHostTabId = 'terminal' | 'sessions' | 'artifacts';

export type ClippyTone = 'ready' | 'busy' | 'attention';

export type ClippySessionState = 'running' | 'idle' | 'completed' | 'failed';

export type ClippyArtifactState = 'ready' | 'pending' | 'error';

export type ClippyArtifactKind = 'summary' | 'report' | 'log' | 'file';

export type ClippyActionStyle = 'default' | 'positive' | 'destructive';

export interface ClippyHostTabVm {
  id: ClippyHostTabId;
  label: string;
  description: string;
  itemCount?: number;
  badge?: string;
  isActive?: boolean;
}

export interface ClippyTerminalPanelVm {
  shellLabel: string;
  workingDirectory: string;
  statusLine: string;
  commandPreview?: string;
}

export interface ClippySessionItemVm {
  id: string;
  label: string;
  detail: string;
  state: ClippySessionState;
}

export interface ClippyArtifactItemVm {
  id: string;
  label: string;
  detail: string;
  state: ClippyArtifactState;
  kind: ClippyArtifactKind;
}

export interface ClippySessionsVm {
  total: number;
  running: number;
  idle: number;
  recent: ClippySessionItemVm[];
}

export interface ClippyArtifactsVm {
  total: number;
  ready: number;
  attention: number;
  recent: ClippyArtifactItemVm[];
}

export interface ClippySubmitActionVm {
  kind: 'submit';
  id: string;
  title: string;
  style?: ClippyActionStyle;
  data: Record<string, string | number | boolean>;
}

export interface ClippyOpenUrlActionVm {
  kind: 'open-url';
  id: string;
  title: string;
  url: string;
}

export type ClippyActionVm = ClippySubmitActionVm | ClippyOpenUrlActionVm;

export interface ClippyTerminalSurfaceVm {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  tone: ClippyTone;
  activeTabId: ClippyHostTabId;
  hostTabs: ClippyHostTabVm[];
  terminal: ClippyTerminalPanelVm;
  sessions: ClippySessionsVm;
  artifacts: ClippyArtifactsVm;
  highlights: string[];
  actions: ClippyActionVm[];
  presetId?: ClippyCardPresetId;
}

export interface AdaptiveCardTextBlock {
  type: 'TextBlock';
  text: string;
  wrap?: boolean;
  size?: 'Small' | 'Default' | 'Medium' | 'Large';
  weight?: 'Default' | 'Bolder';
  color?: 'Default' | 'Accent' | 'Attention' | 'Good' | 'Warning';
  isSubtle?: boolean;
  spacing?: 'None' | 'Small' | 'Medium' | 'Large';
}

export interface AdaptiveCardFact {
  title: string;
  value: string;
}

export interface AdaptiveCardFactSet {
  type: 'FactSet';
  facts: AdaptiveCardFact[];
  spacing?: 'None' | 'Small' | 'Medium' | 'Large';
}

export interface AdaptiveCardContainer {
  type: 'Container';
  items: AdaptiveCardBodyElement[];
  style?: 'default' | 'emphasis';
  spacing?: 'None' | 'Small' | 'Medium' | 'Large';
}

export type AdaptiveCardBodyElement =
  | AdaptiveCardTextBlock
  | AdaptiveCardFactSet
  | AdaptiveCardContainer;

export interface AdaptiveCardSubmitAction {
  type: 'Action.Submit';
  title: string;
  style?: ClippyActionStyle;
  data: Record<string, string | number | boolean>;
}

export interface AdaptiveCardOpenUrlAction {
  type: 'Action.OpenUrl';
  title: string;
  url: string;
}

export type AdaptiveCardAction = AdaptiveCardSubmitAction | AdaptiveCardOpenUrlAction;

export interface AdaptiveCardPayload {
  $schema: 'http://adaptivecards.io/schemas/adaptive-card.json';
  type: 'AdaptiveCard';
  version: '1.5';
  body: AdaptiveCardBodyElement[];
  actions?: AdaptiveCardAction[];
}

const ADAPTIVE_CARD_SCHEMA = 'http://adaptivecards.io/schemas/adaptive-card.json' as const;
const MAX_COMPACT_SUMMARY_LENGTH = 140;

const CLIPPY_CARD_PRESET_IDS = [
  'terminal-ready',
  'terminal-busy',
  'artifact-follow-up',
] as const;

export type ClippyCardPresetId = (typeof CLIPPY_CARD_PRESET_IDS)[number];

function textBlock(
  text: string,
  options?: Omit<AdaptiveCardTextBlock, 'type' | 'text'>,
): AdaptiveCardTextBlock {
  return {
    type: 'TextBlock',
    text,
    ...options,
  };
}

function factSet(facts: AdaptiveCardFact[], spacing?: AdaptiveCardFactSet['spacing']): AdaptiveCardFactSet {
  return {
    type: 'FactSet',
    facts,
    spacing,
  };
}

function container(
  items: AdaptiveCardBodyElement[],
  options?: Omit<AdaptiveCardContainer, 'type' | 'items'>,
): AdaptiveCardContainer {
  return {
    type: 'Container',
    items,
    ...options,
  };
}

function buildAdaptiveCard(
  body: AdaptiveCardBodyElement[],
  actions: AdaptiveCardAction[],
): AdaptiveCardPayload {
  return {
    $schema: ADAPTIVE_CARD_SCHEMA,
    type: 'AdaptiveCard',
    version: '1.5',
    body,
    ...(actions.length > 0 ? { actions } : {}),
  };
}

function toToneColor(tone: ClippyTone): AdaptiveCardTextBlock['color'] {
  switch (tone) {
    case 'ready':
      return 'Good';
    case 'busy':
      return 'Accent';
    case 'attention':
      return 'Attention';
  }
}

function toToneLabel(tone: ClippyTone): string {
  switch (tone) {
    case 'ready':
      return 'Ready';
    case 'busy':
      return 'Busy';
    case 'attention':
      return 'Needs attention';
  }
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildHostTabSummary(tab: ClippyHostTabVm, activeTabId: ClippyHostTabId): string {
  const parts: string[] = [];

  if (tab.id === activeTabId || tab.isActive) {
    parts.push('active');
  }

  if (typeof tab.itemCount === 'number') {
    parts.push(`${tab.itemCount} items`);
  }

  if (tab.badge) {
    parts.push(tab.badge);
  }

  return parts.length > 0 ? `${tab.label}: ${parts.join(' | ')}` : tab.label;
}

function buildSessionSummary(item: ClippySessionItemVm): string {
  return `${item.label} (${item.state}) - ${item.detail}`;
}

function buildArtifactSummary(item: ClippyArtifactItemVm): string {
  return `${item.label} (${item.kind}, ${item.state}) - ${item.detail}`;
}

function buildAction(action: ClippyActionVm): AdaptiveCardAction {
  if (action.kind === 'open-url') {
    return {
      type: 'Action.OpenUrl',
      title: action.title,
      url: action.url,
    };
  }

  return {
    type: 'Action.Submit',
    title: action.title,
    ...(action.style ? { style: action.style } : {}),
    data: {
      actionId: action.id,
      source: 'clippy-card',
      ...action.data,
    },
  };
}

function submitAction(
  id: string,
  title: string,
  data: Record<string, string | number | boolean>,
  style?: ClippyActionStyle,
): ClippySubmitActionVm {
  return {
    kind: 'submit',
    id,
    title,
    ...(style ? { style } : {}),
    data,
  };
}

function openUrlAction(id: string, title: string, url: string): ClippyOpenUrlActionVm {
  return {
    kind: 'open-url',
    id,
    title,
    url,
  };
}

function buildPrimaryFacts(vm: ClippyTerminalSurfaceVm): AdaptiveCardFact[] {
  return [
    { title: 'Tone', value: toToneLabel(vm.tone) },
    { title: 'Active tab', value: vm.activeTabId },
    { title: 'Shell', value: vm.terminal.shellLabel },
    { title: 'Directory', value: vm.terminal.workingDirectory },
    { title: 'Sessions', value: `${vm.sessions.running} running of ${vm.sessions.total}` },
    { title: 'Artifacts', value: `${vm.artifacts.ready} ready, ${vm.artifacts.attention} attention` },
  ];
}

function buildHostTabsSection(vm: ClippyTerminalSurfaceVm): AdaptiveCardContainer {
  const items: AdaptiveCardBodyElement[] = [
    textBlock('Host tabs', { weight: 'Bolder', spacing: 'Medium' }),
    ...vm.hostTabs.map((tab) =>
      textBlock(buildHostTabSummary(tab, vm.activeTabId), {
        wrap: true,
        spacing: 'Small',
      }),
    ),
  ];

  return container(items, { style: 'emphasis', spacing: 'Medium' });
}

function buildHighlightsSection(highlights: string[]): AdaptiveCardContainer | null {
  if (highlights.length === 0) {
    return null;
  }

  return container(
    [
      textBlock('Highlights', { weight: 'Bolder', spacing: 'Medium' }),
      ...highlights.map((highlight) =>
        textBlock(`- ${highlight}`, {
          wrap: true,
          spacing: 'Small',
        }),
      ),
    ],
    { spacing: 'Medium' },
  );
}

function buildRecentsSection(
  title: string,
  values: string[],
  emptyText: string,
): AdaptiveCardContainer {
  const items: AdaptiveCardBodyElement[] = [
    textBlock(title, { weight: 'Bolder', spacing: 'Medium' }),
  ];

  if (values.length === 0) {
    items.push(
      textBlock(emptyText, {
        wrap: true,
        isSubtle: true,
        spacing: 'Small',
      }),
    );
  } else {
    items.push(
      ...values.map((value) =>
        textBlock(`- ${value}`, {
          wrap: true,
          spacing: 'Small',
        }),
      ),
    );
  }

  return container(items, { spacing: 'Medium' });
}

export function buildTerminalSummaryCard(vm: ClippyTerminalSurfaceVm): AdaptiveCardPayload {
  const body: AdaptiveCardBodyElement[] = [
    textBlock(vm.title, {
      size: 'Large',
      weight: 'Bolder',
      color: toToneColor(vm.tone),
    }),
    textBlock(vm.subtitle, {
      wrap: true,
      isSubtle: true,
      spacing: 'Small',
    }),
    textBlock(vm.summary, {
      wrap: true,
      spacing: 'Medium',
    }),
    factSet(buildPrimaryFacts(vm), 'Medium'),
    container(
      [
        textBlock('Terminal', { weight: 'Bolder', spacing: 'Medium' }),
        textBlock(vm.terminal.statusLine, { wrap: true, spacing: 'Small' }),
        ...(vm.terminal.commandPreview
          ? [
              textBlock(`Command: ${vm.terminal.commandPreview}`, {
                wrap: true,
                isSubtle: true,
                spacing: 'Small',
              }),
            ]
          : []),
      ],
      { style: 'emphasis', spacing: 'Medium' },
    ),
    buildHostTabsSection(vm),
    buildRecentsSection(
      'Recent sessions',
      vm.sessions.recent.map(buildSessionSummary),
      'No session activity yet.',
    ),
    buildRecentsSection(
      'Recent artifacts',
      vm.artifacts.recent.map(buildArtifactSummary),
      'No artifacts have been captured yet.',
    ),
  ];

  const highlightsSection = buildHighlightsSection(vm.highlights);
  if (highlightsSection) {
    body.push(highlightsSection);
  }

  return buildAdaptiveCard(body, vm.actions.map(buildAction));
}

export function buildCompactClippyCard(vm: ClippyTerminalSurfaceVm): AdaptiveCardPayload {
  const body: AdaptiveCardBodyElement[] = [
    textBlock(vm.title, {
      weight: 'Bolder',
      color: toToneColor(vm.tone),
    }),
    textBlock(vm.subtitle, {
      wrap: true,
      isSubtle: true,
      spacing: 'Small',
    }),
    textBlock(truncateText(vm.summary, MAX_COMPACT_SUMMARY_LENGTH), {
      wrap: true,
      spacing: 'Medium',
    }),
    factSet(
      [
        { title: 'Tab', value: vm.activeTabId },
        { title: 'Sessions', value: `${vm.sessions.running}/${vm.sessions.total}` },
        { title: 'Artifacts', value: `${vm.artifacts.ready}/${vm.artifacts.total}` },
      ],
      'Medium',
    ),
  ];

  if (vm.highlights.length > 0) {
    body.push(
      textBlock(`Focus: ${vm.highlights[0]}`, {
        wrap: true,
        spacing: 'Medium',
      }),
    );
  }

  return buildAdaptiveCard(body, vm.actions.slice(0, 2).map(buildAction));
}

const PRESET_BUILDERS: Record<ClippyCardPresetId, () => ClippyTerminalSurfaceVm> = {
  'terminal-ready': () => ({
    id: 'clippy-terminal-ready',
    title: 'Clippy terminal handoff',
    subtitle: 'Host shell is stable and ready for the next command.',
    summary:
      'PowerShell is attached in the host tab, two working sessions are resumable, and recent artifacts are ready for a compact adaptive card summary.',
    tone: 'ready',
    activeTabId: 'terminal',
    hostTabs: [
      { id: 'terminal', label: 'Terminal', description: 'Interactive host shell', itemCount: 1, isActive: true },
      { id: 'sessions', label: 'Sessions', description: 'Saved shell sessions', itemCount: 2, badge: 'resume' },
      { id: 'artifacts', label: 'Artifacts', description: 'Generated summaries and logs', itemCount: 3, badge: 'ready' },
    ],
    terminal: {
      shellLabel: 'PowerShell',
      workingDirectory: 'E:\\copilothub',
      statusLine: 'Terminal tab is idle and ready.',
      commandPreview: 'pnpm test -- clippy',
    },
    sessions: {
      total: 2,
      running: 1,
      idle: 1,
      recent: [
        {
          id: 'session-build',
          label: 'Build session',
          detail: 'Last command finished cleanly.',
          state: 'completed',
        },
        {
          id: 'session-review',
          label: 'Review session',
          detail: 'Ready to resume for follow-up checks.',
          state: 'idle',
        },
      ],
    },
    artifacts: {
      total: 3,
      ready: 3,
      attention: 0,
      recent: [
        {
          id: 'artifact-summary',
          label: 'Summary card',
          detail: 'Prepared for compact widget rendering.',
          state: 'ready',
          kind: 'summary',
        },
        {
          id: 'artifact-log',
          label: 'Session transcript',
          detail: 'Stored for later inspection.',
          state: 'ready',
          kind: 'log',
        },
      ],
    },
    highlights: ['Terminal tab owns execution while cards stay summary-only.'],
    actions: [
      submitAction('resume-terminal', 'Resume terminal', { verb: 'host.switchTab', target: 'terminal' }, 'positive'),
      submitAction('view-artifacts', 'View artifacts', { verb: 'host.switchTab', target: 'artifacts' }),
    ],
    presetId: 'terminal-ready',
  }),
  'terminal-busy': () => ({
    id: 'clippy-terminal-busy',
    title: 'Clippy active terminal',
    subtitle: 'Long-running work is in progress in the host shell.',
    summary:
      'The terminal is streaming output, one background session is active, and Clippy is using adaptive cards only for status and next actions.',
    tone: 'busy',
    activeTabId: 'terminal',
    hostTabs: [
      { id: 'terminal', label: 'Terminal', description: 'Interactive host shell', itemCount: 1, isActive: true, badge: 'live' },
      { id: 'sessions', label: 'Sessions', description: 'Saved shell sessions', itemCount: 3, badge: '1 running' },
      { id: 'artifacts', label: 'Artifacts', description: 'Generated summaries and logs', itemCount: 1, badge: 'pending' },
    ],
    terminal: {
      shellLabel: 'PowerShell',
      workingDirectory: 'E:\\copilothub',
      statusLine: 'Vitest is running in watch mode.',
      commandPreview: 'npm run test -- src/lib/clippyCards.test.ts',
    },
    sessions: {
      total: 3,
      running: 1,
      idle: 1,
      recent: [
        {
          id: 'session-watch',
          label: 'Watch session',
          detail: 'Streaming test output into the host tab.',
          state: 'running',
        },
        {
          id: 'session-smoke',
          label: 'Smoke session',
          detail: 'Queued after the current watch cycle.',
          state: 'idle',
        },
      ],
    },
    artifacts: {
      total: 1,
      ready: 0,
      attention: 0,
      recent: [
        {
          id: 'artifact-live-summary',
          label: 'Live summary',
          detail: 'Will refresh when the next watch cycle completes.',
          state: 'pending',
          kind: 'summary',
        },
      ],
    },
    highlights: ['Keep tabs in React and use cards only for actions and compact status.'],
    actions: [
      submitAction('open-sessions', 'Open sessions', { verb: 'host.switchTab', target: 'sessions' }),
      openUrlAction('view-docs', 'Open docs', 'https://adaptivecards.io'),
    ],
    presetId: 'terminal-busy',
  }),
  'artifact-follow-up': () => ({
    id: 'clippy-artifact-follow-up',
    title: 'Clippy artifact follow-up',
    subtitle: 'Artifacts need a quick review before the next handoff.',
    summary:
      'The host tabs show ready logs plus one report that needs attention, making this a good demo preset for a compact widget with follow-up actions.',
    tone: 'attention',
    activeTabId: 'artifacts',
    hostTabs: [
      { id: 'terminal', label: 'Terminal', description: 'Interactive host shell', itemCount: 1 },
      { id: 'sessions', label: 'Sessions', description: 'Saved shell sessions', itemCount: 2, badge: 'resume' },
      { id: 'artifacts', label: 'Artifacts', description: 'Generated summaries and logs', itemCount: 4, isActive: true, badge: '1 attention' },
    ],
    terminal: {
      shellLabel: 'PowerShell',
      workingDirectory: 'E:\\copilothub',
      statusLine: 'Terminal is idle while artifact review is pending.',
      commandPreview: 'code src/lib/clippyCards.ts',
    },
    sessions: {
      total: 2,
      running: 0,
      idle: 2,
      recent: [
        {
          id: 'session-follow-up',
          label: 'Follow-up session',
          detail: 'Waiting on artifact review decisions.',
          state: 'idle',
        },
      ],
    },
    artifacts: {
      total: 4,
      ready: 3,
      attention: 1,
      recent: [
        {
          id: 'artifact-report',
          label: 'Regression report',
          detail: 'One failed assertion needs review.',
          state: 'error',
          kind: 'report',
        },
        {
          id: 'artifact-log',
          label: 'Transcript log',
          detail: 'Available for quick inspection.',
          state: 'ready',
          kind: 'log',
        },
      ],
    },
    highlights: ['Artifacts stay compact in cards while detailed browsing stays in the host tab.'],
    actions: [
      submitAction(
        'open-artifacts',
        'Open artifacts',
        { verb: 'host.switchTab', target: 'artifacts', focus: 'regression-report' },
        'destructive',
      ),
      submitAction('return-terminal', 'Back to terminal', { verb: 'host.switchTab', target: 'terminal' }),
    ],
    presetId: 'artifact-follow-up',
  }),
};

export function listClippyCardPresetIds(): ClippyCardPresetId[] {
  return [...CLIPPY_CARD_PRESET_IDS];
}

export function createClippyDemoVm(presetId: ClippyCardPresetId): ClippyTerminalSurfaceVm {
  return PRESET_BUILDERS[presetId]();
}
