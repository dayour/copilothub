// ---------------------------------------------------------------------------
// RecordingsPanel.tsx -- List and manage persisted follow-me recordings.
// Reads from ~/Videos/CopilotHub/ via captureStorage. Provides replay,
// copy-code, delete, and reveal-in-Explorer actions.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  Clapperboard,
  Copy,
  FolderOpen,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { useRecordingState } from '../hooks/useRecordingState';
import { captureStorage, type SavedRecording } from '../lib/captureStorage';
import { followMeRecorder } from '../lib/followMeRecorder';

function formatTimestamp(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function formatDuration(start: number, end: number): string {
  if (!start || !end || end < start) return '';
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export function RecordingsPanel() {
  const { saved, hydrate, isReplaying } = useRecordingState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await hydrate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // refresh on mount only — subscription handles updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async (rec: SavedRecording) => {
    try {
      const code = await captureStorage.readRecordingCode(rec);
      if (!code) {
        setError('No replay code is associated with this recording.');
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopiedFilename(rec.manifestFilename);
      setTimeout(() => setCopiedFilename(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to copy code');
    }
  };

  const handleReplay = async (rec: SavedRecording) => {
    try {
      await followMeRecorder.replay(rec.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Replay failed');
    }
  };

  const handleDelete = async (rec: SavedRecording) => {
    if (!confirm(`Delete "${rec.name}"?\n\nThis removes ${rec.manifestFilename} from disk.`)) {
      return;
    }
    try {
      await followMeRecorder.deleteSavedRecording(rec.manifestFilename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete recording');
    }
  };

  const handleReveal = async (rec: SavedRecording) => {
    try {
      await captureStorage.revealRecording(rec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open Explorer');
    }
  };

  const handleOpenFolder = async () => {
    try {
      await captureStorage.openRecordingsFolder();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open folder');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Clapperboard size={16} className="text-sky-400" />
          <span className="text-sm font-medium">Recordings</span>
          <span className="text-xs text-zinc-500">{saved.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="rounded p-1 hover:bg-zinc-800 transition-colors"
            aria-label="Open recordings folder"
            title="Open ~/Videos/CopilotHub/"
          >
            <FolderOpen size={14} />
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded p-1 hover:bg-zinc-800 transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 text-xs text-red-300 bg-red-950/50 border-b border-red-900">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {saved.length === 0 ? (
          <div className="px-3 py-10 text-center text-xs text-zinc-500">
            {loading
              ? 'Loading recordings…'
              : 'No saved recordings. Press Ctrl+Alt+R to start one.'}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {saved.map((rec) => (
              <li key={rec.manifestFilename} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{rec.name}</div>
                    <div className="text-[11px] text-zinc-500 tabular-nums">
                      {formatTimestamp(rec.startedAt)}
                      {' · '}
                      {formatDuration(rec.startedAt, rec.stoppedAt)}
                    </div>
                    <div className="text-[10px] text-zinc-600 truncate font-mono">
                      {rec.manifestFilename}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-none">
                    <button
                      type="button"
                      onClick={() => handleReplay(rec)}
                      disabled={isReplaying}
                      className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40
                                 disabled:cursor-not-allowed transition-colors"
                      aria-label="Replay"
                      title="Replay"
                    >
                      <Play size={13} className="text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(rec)}
                      className="rounded p-1 hover:bg-zinc-800 transition-colors"
                      aria-label="Copy replay code"
                      title="Copy replay code"
                    >
                      <Copy
                        size={13}
                        className={
                          copiedFilename === rec.manifestFilename ? 'text-emerald-400' : ''
                        }
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReveal(rec)}
                      className="rounded p-1 hover:bg-zinc-800 transition-colors"
                      aria-label="Reveal in Explorer"
                      title="Reveal in Explorer"
                    >
                      <FolderOpen size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rec)}
                      className="rounded p-1 hover:bg-zinc-800 transition-colors"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RecordingsPanel;
