// ---------------------------------------------------------------------------
// tauri.ts -- Tauri runtime detection
// Returns true when the app is running inside the Tauri native shell.
// ---------------------------------------------------------------------------

export const isTauri: boolean =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
