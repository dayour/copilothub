// ---------------------------------------------------------------------------
// useRecordingState.ts -- React hook exposing the follow-me recorder state
// to components. Subscribes to FollowMeRecorder.onChange and onSavedChange
// and returns derived values for the UI.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';

import { followMeRecorder, type Recording } from '../lib/followMeRecorder';
import type { SavedRecording } from '../lib/captureStorage';

export interface RecordingState {
  current: Recording | null;
  isRecording: boolean;
  isReplaying: boolean;
  isStopping: boolean;
  saved: SavedRecording[];
  hydrate: () => Promise<SavedRecording[]>;
}

export function useRecordingState(): RecordingState {
  const [current, setCurrent] = useState<Recording | null>(followMeRecorder.getCurrent());
  const [saved, setSaved] = useState<SavedRecording[]>(followMeRecorder.getSavedRecordings());

  useEffect(() => {
    const offCurrent = followMeRecorder.onChange(setCurrent);
    const offSaved = followMeRecorder.onSavedChange(setSaved);
    return () => {
      offCurrent();
      offSaved();
    };
  }, []);

  return {
    current,
    isRecording: current?.status === 'recording',
    isReplaying: current?.status === 'replaying',
    isStopping: current?.status === 'stopping',
    saved,
    hydrate: () => followMeRecorder.hydrate(),
  };
}
