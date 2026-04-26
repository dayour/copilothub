import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CLIPPY_TERMINAL_SHELL_PRESETS,
  ClippyTerminalShell,
  type ClippyArtifactItem,
  type ClippySessionItem,
  type ClippyTerminalSummary,
} from './ClippyTerminalShell';
import { COMPACT_CLIPPY_WIDGET_PRESETS, CompactClippyWidget } from './CompactClippyWidget';

const terminal: ClippyTerminalSummary = {
  shellLabel: 'PowerShell',
  workingDirectory: 'E:/copilothub',
  currentCommand: 'npm run dev -- --host',
  statusLabel: 'Streaming',
  statusTone: 'success',
  helperText: 'Attached to the active host shell for demo playback.',
  latencyLabel: '92 ms',
  lastOutputPreview: 'ready in 812 ms\nLocal: http://localhost:1420/',
  metrics: [
    { label: 'Host tabs', value: '3' },
    { label: 'Attached agents', value: '2' },
    { label: 'Pending approvals', value: '1' },
    { label: 'Artifacts', value: '4' },
  ],
};

const sessions: readonly ClippySessionItem[] = [
  {
    id: 'session-01',
    label: 'Terminal session 01',
    detail: 'Workspace shell streaming logs for the current demo pass.',
    startedAt: 'Started 2 minutes ago',
    ownerLabel: 'Owner: host shell',
    stateLabel: 'Active',
    stateTone: 'success',
  },
  {
    id: 'session-02',
    label: 'Artifact staging',
    detail: 'Preparing transcript and trace bundle for export.',
    startedAt: 'Started 7 minutes ago',
    stateLabel: 'Queued',
    stateTone: 'warning',
  },
];

const artifacts: readonly ClippyArtifactItem[] = [
  {
    id: 'artifact-01',
    label: 'clippy-runbook.txt',
    kindLabel: 'Transcript',
    detail: 'Conversation transcript with session notes and shell output summary.',
    updatedAt: 'Updated 1 minute ago',
    statusLabel: 'Ready',
    statusTone: 'success',
  },
  {
    id: 'artifact-02',
    label: 'diagnostic-trace.json',
    kindLabel: 'Trace',
    detail: 'Host diagnostic export containing shell state and artifact lineage.',
    updatedAt: 'Updated just now',
    statusLabel: 'Collecting',
    statusTone: 'warning',
  },
];

describe('ClippyTerminalShell', () => {
  it('switches between terminal, sessions, and artifacts tabs', () => {
    render(
      <ClippyTerminalShell
        terminal={terminal}
        sessions={sessions}
        artifacts={artifacts}
        diagnostics={['Shell catalog resolved successfully.']}
      />,
    );

    expect(screen.getByText('npm run dev -- --host')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
    expect(screen.getByText('Terminal session 01')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sessions' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Artifacts' }));
    expect(screen.getByText('clippy-runbook.txt')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Artifacts' })).toHaveAttribute('aria-selected', 'true');
  });

  it.each([
    ['compact'],
    ['detailed'],
    ['diagnostic'],
  ] as const)('renders the %s shell preset metadata', (variant) => {
    render(
      <ClippyTerminalShell
        variant={variant}
        terminal={terminal}
        sessions={sessions}
        artifacts={artifacts}
        diagnostics={variant === 'diagnostic' ? ['Telemetry buffering enabled.'] : []}
      />,
    );

    const preset = CLIPPY_TERMINAL_SHELL_PRESETS[variant];
    expect(screen.getByText(preset.label)).toBeInTheDocument();
    expect(screen.getByText(preset.description)).toBeInTheDocument();

    if (variant === 'diagnostic') {
      expect(screen.getByText('Diagnostics')).toBeInTheDocument();
      expect(screen.getByText('Telemetry buffering enabled.')).toBeInTheDocument();
    }
  });

  it('supports controlled tab selection callbacks for later integration', () => {
    const onTabChange = vi.fn();

    render(
      <ClippyTerminalShell
        activeTab="terminal"
        onTabChange={onTabChange}
        terminal={terminal}
        sessions={sessions}
        artifacts={artifacts}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Artifacts' }));

    expect(onTabChange).toHaveBeenCalledWith('artifacts');
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('CompactClippyWidget', () => {
  it.each([
    ['compact'],
    ['detailed'],
    ['diagnostic'],
  ] as const)('renders the %s widget variation', (variant) => {
    const actionSpy = vi.fn();

    render(
      <CompactClippyWidget
        variant={variant}
        message="Host shell synced. Pick a follow-up action to keep the demo moving."
        statusLabel="Ready"
        statusTone="success"
        metrics={[
          { label: 'Sessions', value: '2 active' },
          { label: 'Artifacts', value: '4 ready' },
        ]}
        actions={[
          { id: 'resume', label: 'Resume stream', onSelect: actionSpy, tone: 'neutral' },
        ]}
      />,
    );

    expect(screen.getByText('Host shell synced. Pick a follow-up action to keep the demo moving.')).toBeInTheDocument();

    if (variant !== 'compact') {
      const preset = COMPACT_CLIPPY_WIDGET_PRESETS[variant];
      expect(screen.getByText(preset.label)).toBeInTheDocument();
      expect(screen.getByText(preset.description)).toBeInTheDocument();
      expect(screen.getByText('2 active')).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: 'Resume stream' }));
    expect(actionSpy).toHaveBeenCalledWith('resume');
  });
});
