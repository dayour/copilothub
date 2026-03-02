// ---------------------------------------------------------------------------
// runbookStore.ts -- Zustand store for Runbook Marketplace state in CopilotHub
// Persists runbook list, search, editor, and CRUD operations across tab
// open/close cycles so that UI state survives unmount.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { runbookStorage, type RunbookSummary } from '../lib/runbookStorage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RUNBOOK_TEMPLATE = `manifest:
  name: Example Runbook
  version: 1.0.0
  author: CopilotHub
  description: Describe what this runbook does.
  tags:
    - example
    - automation
  visibility: personal

variables: []

steps:
  - id: step-1
    tool: browser.navigate
    args:
      url: https://example.com
`;

const DEFAULT_FILENAME = 'new-runbook.yaml';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface RunbookStore {
  // -- State --
  runbooks: RunbookSummary[];
  search: string;
  isLoading: boolean;
  error: string | null;
  isEditorOpen: boolean;
  filenameInput: string;
  editorContent: string;
  isSaving: boolean;
  confirmDeleteId: string | null;

  // -- Computed --
  filteredRunbooks: () => RunbookSummary[];

  // -- Simple setters --
  setSearch: (query: string) => void;
  setError: (error: string | null) => void;
  setFilenameInput: (filename: string) => void;
  setEditorContent: (content: string) => void;
  setConfirmDeleteId: (id: string | null) => void;

  // -- Editor lifecycle --
  openEditor: (filename?: string, content?: string) => void;
  closeEditor: () => void;
  resetEditor: () => void;

  // -- Async CRUD --
  loadRunbooks: () => Promise<void>;
  saveRunbook: () => Promise<void>;
  deleteRunbook: (filename: string) => Promise<void>;
  editRunbook: (filename: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRunbookStore = create<RunbookStore>()(
  immer((set, get) => ({
    // -- State ---------------------------------------------------------------
    runbooks: [],
    search: '',
    isLoading: false,
    error: null,
    isEditorOpen: false,
    filenameInput: DEFAULT_FILENAME,
    editorContent: DEFAULT_RUNBOOK_TEMPLATE,
    isSaving: false,
    confirmDeleteId: null,

    // -- Computed ------------------------------------------------------------

    filteredRunbooks: () => {
      const { runbooks, search } = get();
      const query = search.trim().toLowerCase();
      if (!query) {
        return runbooks;
      }
      return runbooks.filter((runbook) => {
        const haystack = [runbook.name, runbook.description, runbook.tags.join(' ')]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    },

    // -- Simple setters ------------------------------------------------------

    setSearch: (query: string) => {
      set((state) => {
        state.search = query;
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error;
      });
    },

    setFilenameInput: (filename: string) => {
      set((state) => {
        state.filenameInput = filename;
      });
    },

    setEditorContent: (content: string) => {
      set((state) => {
        state.editorContent = content;
      });
    },

    setConfirmDeleteId: (id: string | null) => {
      set((state) => {
        state.confirmDeleteId = id;
      });
    },

    // -- Editor lifecycle ----------------------------------------------------

    openEditor: (filename?: string, content?: string) => {
      set((state) => {
        state.filenameInput = filename ?? DEFAULT_FILENAME;
        state.editorContent = content ?? DEFAULT_RUNBOOK_TEMPLATE;
        state.isEditorOpen = true;
      });
    },

    closeEditor: () => {
      set((state) => {
        state.isEditorOpen = false;
      });
    },

    resetEditor: () => {
      set((state) => {
        state.isEditorOpen = false;
        state.filenameInput = DEFAULT_FILENAME;
        state.editorContent = DEFAULT_RUNBOOK_TEMPLATE;
        state.isSaving = false;
      });
    },

    // -- Async CRUD ----------------------------------------------------------

    loadRunbooks: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      try {
        const items = await runbookStorage.listRunbooks();
        set((state) => {
          state.runbooks = items;
        });
      } catch (loadError) {
        set((state) => {
          state.error =
            loadError instanceof Error ? loadError.message : 'Failed to load runbooks.';
        });
      } finally {
        set((state) => {
          state.isLoading = false;
        });
      }
    },

    saveRunbook: async () => {
      const { filenameInput, editorContent } = get();
      set((state) => {
        state.isSaving = true;
        state.error = null;
      });
      try {
        await runbookStorage.writeRunbook(filenameInput, editorContent);
        set((state) => {
          state.isEditorOpen = false;
        });
        // Reload list to reflect changes
        await get().loadRunbooks();
      } catch (saveError) {
        set((state) => {
          state.error =
            saveError instanceof Error ? saveError.message : 'Failed to save runbook.';
        });
      } finally {
        set((state) => {
          state.isSaving = false;
        });
      }
    },

    deleteRunbook: async (filename: string) => {
      try {
        await runbookStorage.deleteRunbook(filename);
        set((state) => {
          state.confirmDeleteId = null;
        });
        // Reload list to reflect deletion
        await get().loadRunbooks();
      } catch (deleteError) {
        set((state) => {
          state.error =
            deleteError instanceof Error ? deleteError.message : 'Failed to delete runbook.';
        });
      }
    },

    editRunbook: async (filename: string) => {
      try {
        const content = await runbookStorage.readRunbook(filename);
        set((state) => {
          state.filenameInput = filename;
          state.editorContent = content;
          state.isEditorOpen = true;
        });
      } catch (readError) {
        set((state) => {
          state.error =
            readError instanceof Error ? readError.message : 'Failed to open runbook.';
        });
      }
    },
  })),
);
