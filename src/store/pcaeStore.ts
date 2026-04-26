// ---------------------------------------------------------------------------
// pcaeStore.ts -- Zustand store for CoWork Plan-Checkpoint-Approve-Execute state
// Tracks background agentic tasks through the PCAE lifecycle.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PcaePhase = 'planning' | 'checkpoint' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';

export type PcaeTaskPriority = 'high' | 'normal' | 'low';

export interface PcaeCheckpoint {
  id: string;
  stepIndex: number;
  description: string;
  proposedAction: string;
  approvedAt: number | null;
  rejectedAt: number | null;
  approvedBy: 'user' | 'auto' | null;
}

export interface PcaeExecutionStep {
  id: string;
  description: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: number | null;
  completedAt: number | null;
  output: string | null;
  error: string | null;
}

export interface PcaeTask {
  id: string;
  title: string;
  description: string;
  goal: string;
  phase: PcaePhase;
  priority: PcaeTaskPriority;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  plan: string[];
  checkpoints: PcaeCheckpoint[];
  steps: PcaeExecutionStep[];
  result: string | null;
  error: string | null;
  /** Approval policy inherited from appStore at task creation time. */
  approvalPolicy: 'on-request' | 'on-failure' | 'untrusted-only';
  tags: string[];
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface PcaeStore {
  // -- State --
  tasks: PcaeTask[];
  selectedTaskId: string | null;
  isCreating: boolean;
  newTaskDraft: string;

  // -- Computed --
  selectedTask: () => PcaeTask | undefined;
  activeTasks: () => PcaeTask[];
  completedTasks: () => PcaeTask[];
  pendingApprovalTasks: () => PcaeTask[];

  // -- Task lifecycle --
  createTask: (goal: string, options?: { title?: string; priority?: PcaeTaskPriority; tags?: string[] }) => string;
  updateTaskPhase: (id: string, phase: PcaePhase) => void;
  setPlan: (id: string, plan: string[]) => void;
  addCheckpoint: (id: string, checkpoint: Omit<PcaeCheckpoint, 'approvedAt' | 'rejectedAt' | 'approvedBy'>) => void;
  approveCheckpoint: (taskId: string, checkpointId: string, approvedBy?: 'user' | 'auto') => void;
  rejectCheckpoint: (taskId: string, checkpointId: string) => void;
  addStep: (id: string, step: Omit<PcaeExecutionStep, 'startedAt' | 'completedAt' | 'output' | 'error'>) => void;
  updateStep: (taskId: string, stepId: string, update: Partial<Pick<PcaeExecutionStep, 'status' | 'output' | 'error' | 'startedAt' | 'completedAt'>>) => void;
  completeTask: (id: string, result: string) => void;
  failTask: (id: string, error: string) => void;
  cancelTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // -- UI --
  selectTask: (id: string | null) => void;
  setNewTaskDraft: (draft: string) => void;
  setIsCreating: (creating: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): number {
  return Date.now();
}

function makeTaskId(): string {
  return `pcae-${now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeCheckpointId(): string {
  return `chk-${now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeStepId(): string {
  return `step-${now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const usePcaeStore = create<PcaeStore>()(
  immer((set, get) => ({
    tasks: [],
    selectedTaskId: null,
    isCreating: false,
    newTaskDraft: '',

    selectedTask: () => {
      const { tasks, selectedTaskId } = get();
      return selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;
    },

    activeTasks: () =>
      get().tasks.filter((t) =>
        t.phase === 'planning' || t.phase === 'checkpoint' || t.phase === 'approved' || t.phase === 'executing',
      ),

    completedTasks: () =>
      get().tasks.filter((t) => t.phase === 'completed' || t.phase === 'failed' || t.phase === 'cancelled'),

    pendingApprovalTasks: () =>
      get().tasks.filter(
        (t) => t.phase === 'checkpoint' && t.checkpoints.some((c) => !c.approvedAt && !c.rejectedAt),
      ),

    createTask: (goal, options = {}) => {
      const id = makeTaskId();
      set((state) => {
        state.tasks.unshift({
          id,
          title: options.title ?? goal.slice(0, 60),
          description: goal,
          goal,
          phase: 'planning',
          priority: options.priority ?? 'normal',
          createdAt: now(),
          updatedAt: now(),
          completedAt: null,
          plan: [],
          checkpoints: [],
          steps: [],
          result: null,
          error: null,
          approvalPolicy: 'on-request',
          tags: options.tags ?? [],
        });
        state.selectedTaskId = id;
      });
      return id;
    },

    updateTaskPhase: (id, phase) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.phase = phase;
          task.updatedAt = now();
        }
      });
    },

    setPlan: (id, plan) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.plan = plan;
          task.phase = plan.length > 0 ? 'checkpoint' : 'planning';
          task.updatedAt = now();
        }
      });
    },

    addCheckpoint: (id, checkpoint) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.checkpoints.push({
            ...checkpoint,
            id: checkpoint.id ?? makeCheckpointId(),
            approvedAt: null,
            rejectedAt: null,
            approvedBy: null,
          });
          task.phase = 'checkpoint';
          task.updatedAt = now();
        }
      });
    },

    approveCheckpoint: (taskId, checkpointId, approvedBy = 'user') => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const checkpoint = task.checkpoints.find((c) => c.id === checkpointId);
        if (checkpoint) {
          checkpoint.approvedAt = now();
          checkpoint.approvedBy = approvedBy;
        }
        // If all checkpoints approved, move to executing.
        const allApproved = task.checkpoints.every((c) => c.approvedAt !== null);
        if (allApproved) {
          task.phase = 'approved';
        }
        task.updatedAt = now();
      });
    },

    rejectCheckpoint: (taskId, checkpointId) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const checkpoint = task.checkpoints.find((c) => c.id === checkpointId);
        if (checkpoint) {
          checkpoint.rejectedAt = now();
        }
        task.phase = 'cancelled';
        task.updatedAt = now();
      });
    },

    addStep: (id, step) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.steps.push({
            ...step,
            id: step.id ?? makeStepId(),
            startedAt: null,
            completedAt: null,
            output: null,
            error: null,
          });
          task.updatedAt = now();
        }
      });
    },

    updateStep: (taskId, stepId, update) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return;
        const step = task.steps.find((s) => s.id === stepId);
        if (step) {
          Object.assign(step, update);
        }
        task.updatedAt = now();
      });
    },

    completeTask: (id, result) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.phase = 'completed';
          task.result = result;
          task.completedAt = now();
          task.updatedAt = now();
        }
      });
    },

    failTask: (id, error) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.phase = 'failed';
          task.error = error;
          task.updatedAt = now();
        }
      });
    },

    cancelTask: (id) => {
      set((state) => {
        const task = state.tasks.find((t) => t.id === id);
        if (task) {
          task.phase = 'cancelled';
          task.updatedAt = now();
        }
      });
    },

    deleteTask: (id) => {
      set((state) => {
        state.tasks = state.tasks.filter((t) => t.id !== id);
        if (state.selectedTaskId === id) {
          state.selectedTaskId = state.tasks[0]?.id ?? null;
        }
      });
    },

    selectTask: (id) => {
      set((state) => {
        state.selectedTaskId = id;
      });
    },

    setNewTaskDraft: (draft) => {
      set((state) => {
        state.newTaskDraft = draft;
      });
    },

    setIsCreating: (creating) => {
      set((state) => {
        state.isCreating = creating;
      });
    },
  })),
);

export default usePcaeStore;
