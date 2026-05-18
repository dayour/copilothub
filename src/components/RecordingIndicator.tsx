// ---------------------------------------------------------------------------
// RecordingIndicator.tsx -- Compact "recording in progress" badge.
// Renders only while the follow-me recorder is active or replaying.
// Pulsing red dot for record, gradient pulse for replay.
// ---------------------------------------------------------------------------

import { Circle, Play, StopCircle } from 'lucide-react';

import { useRecordingState } from '../hooks/useRecordingState';
import { followMeRecorder } from '../lib/followMeRecorder';

export function RecordingIndicator() {
  const { current, isRecording, isReplaying, isStopping } = useRecordingState();

  if (!current) return null;

  const label = isRecording
    ? 'Recording'
    : isReplaying
      ? 'Replaying'
      : isStopping
        ? 'Stopping'
        : 'Idle';

  const handleStop = () => {
    void followMeRecorder.stopRecording().catch(() => {
      /* swallow — UI already reflects state via subscription */
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-full border border-zinc-700
                 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-200 backdrop-blur"
    >
      {isRecording ? (
        <Circle size={10} className="fill-red-500 text-red-500 animate-pulse" />
      ) : isReplaying ? (
        <Play size={10} className="text-sky-400 animate-pulse" />
      ) : (
        <Circle size={10} className="text-amber-400" />
      )}
      <span className="font-medium tracking-wide">{label}</span>
      {isRecording && (
        <button
          type="button"
          onClick={handleStop}
          className="ml-1 inline-flex items-center gap-1 rounded
                     bg-zinc-800 px-1.5 py-0.5 text-[10px]
                     hover:bg-zinc-700 transition-colors"
          aria-label="Stop recording"
          title="Stop recording (Ctrl+Alt+R)"
        >
          <StopCircle size={10} /> Stop
        </button>
      )}
    </div>
  );
}

export default RecordingIndicator;
