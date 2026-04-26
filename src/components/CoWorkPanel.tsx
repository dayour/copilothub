// ---------------------------------------------------------------------------
// CoWorkPanel.tsx -- Copilot CoWork PCAE workspace tab for CopilotHub
// Provides Plan-Checkpoint-Approve-Execute task management and Work IQ queries.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, AlertCircle, CheckCircle2, ChevronRight,
  Clock, ListTodo, Play, Plus, RefreshCw, Search,
  Square, Trash2, XCircle, Zap,
} from 'lucide-react';
import { usePcaeStore, type PcaePhase, type PcaeTask } from '../store/pcaeStore';
import workIqClient from '../lib/workIqClient';
import type { WorkIqResponse } from '../lib/workIqClient';

// ---------------------------------------------------------------------------
// Phase badge
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<PcaePhase, string> = {
  planning: 'Planning',
  checkpoint: 'Awaiting Approval',
  approved: 'Approved',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const PHASE_COLORS: Record<PcaePhase, string> = {
  planning: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  checkpoint: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  executing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled: 'bg-surface-tertiary text-text-muted border-border-default',
};

function PhaseBadge({ phase }: { phase: PcaePhase }) {
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${PHASE_COLORS[phase]}`}>
      {PHASE_LABELS[phase]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Work IQ query widget
// ---------------------------------------------------------------------------

function WorkIqQueryWidget() {
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [response, setResponse] = useState<WorkIqResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setIsQuerying(true);
    setError(null);
    setResponse(null);

    const result = await workIqClient.query(q);
    setIsQuerying(false);
    if (result.success && result.response) {
      setResponse(result.response);
    } else {
      setError(result.error ?? 'Unknown error from Work IQ.');
    }
  }, [question]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-secondary p-4">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Work IQ</span>
        <span className="ml-auto text-xs text-text-muted">M365 Semantic Layer</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          className="min-w-0 flex-1 rounded border border-border-default bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-blue-400 focus:outline-none"
          placeholder="Ask about your emails, meetings, documents..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isQuerying}
        />
        <button
          type="submit"
          disabled={isQuerying || !question.trim()}
          className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-tertiary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          {isQuerying ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
          {isQuerying ? 'Querying...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="flex flex-col gap-2">
          <div className="rounded border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {response.answer}
          </div>
          {response.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {response.sources.slice(0, 5).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-border-default bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                  title={src.url}
                >
                  <span className="max-w-[160px] truncate">{src.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task creation form
// ---------------------------------------------------------------------------

function NewTaskForm({ onCancel }: { onCancel: () => void }) {
  const createTask = usePcaeStore((s) => s.createTask);
  const [goal, setGoal] = useState('');

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const g = goal.trim();
    if (!g) return;
    createTask(g);
    setGoal('');
    onCancel();
  }, [goal, createTask, onCancel]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
      <label className="text-xs font-semibold text-text-secondary">Describe the task goal</label>
      <textarea
        className="min-h-[72px] w-full resize-y rounded border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-blue-400 focus:outline-none"
        placeholder="e.g. Summarize all emails from last week about Project Alpha and draft a status update"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border-default bg-surface-tertiary px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!goal.trim()}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          <Plus size={12} />
          Create Task
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Checkpoint approval card
// ---------------------------------------------------------------------------

function CheckpointCard({ task }: { task: PcaeTask }) {
  const approveCheckpoint = usePcaeStore((s) => s.approveCheckpoint);
  const rejectCheckpoint = usePcaeStore((s) => s.rejectCheckpoint);
  const pendingCheckpoints = task.checkpoints.filter((c) => !c.approvedAt && !c.rejectedAt);

  if (pendingCheckpoints.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-yellow-300">
        <Clock size={13} />
        Awaiting your approval ({pendingCheckpoints.length} checkpoint{pendingCheckpoints.length !== 1 ? 's' : ''})
      </div>
      {pendingCheckpoints.map((cp) => (
        <div key={cp.id} className="rounded border border-border-default bg-surface-primary p-3">
          <p className="text-sm text-text-primary">{cp.description}</p>
          {cp.proposedAction && (
            <p className="mt-1 text-xs text-text-muted">
              <span className="font-medium text-text-secondary">Proposed action:</span> {cp.proposedAction}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => approveCheckpoint(task.id, cp.id, 'user')}
              className="inline-flex items-center gap-1.5 rounded border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20"
            >
              <CheckCircle2 size={12} />
              Approve
            </button>
            <button
              type="button"
              onClick={() => rejectCheckpoint(task.id, cp.id)}
              className="inline-flex items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
            >
              <XCircle size={12} />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task detail view
// ---------------------------------------------------------------------------

function TaskDetail({ task }: { task: PcaeTask }) {
  const cancelTask = usePcaeStore((s) => s.cancelTask);
  const deleteTask = usePcaeStore((s) => s.deleteTask);
  const selectTask = usePcaeStore((s) => s.selectTask);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-text-primary">{task.title}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{new Date(task.createdAt).toLocaleString()}</p>
        </div>
        <PhaseBadge phase={task.phase} />
      </div>

      {/* Goal */}
      <div className="rounded border border-border-default bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
        {task.goal}
      </div>

      {/* Checkpoint approval */}
      {task.phase === 'checkpoint' && <CheckpointCard task={task} />}

      {/* Plan */}
      {task.plan.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Plan</span>
          <ol className="flex flex-col gap-1">
            {task.plan.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <ChevronRight size={13} className="mt-0.5 shrink-0 text-text-muted" />
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Steps execution log */}
      {task.steps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Execution Steps</span>
          <div className="flex flex-col gap-1">
            {task.steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2 rounded border border-border-default bg-surface-secondary px-2 py-1.5">
                {step.status === 'completed' && <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />}
                {step.status === 'failed' && <XCircle size={13} className="mt-0.5 shrink-0 text-red-400" />}
                {step.status === 'running' && <RefreshCw size={13} className="mt-0.5 shrink-0 animate-spin text-purple-400" />}
                {step.status === 'pending' && <Clock size={13} className="mt-0.5 shrink-0 text-text-muted" />}
                {step.status === 'skipped' && <Square size={13} className="mt-0.5 shrink-0 text-text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary">{step.description}</p>
                  {step.output && (
                    <p className="mt-0.5 truncate text-xs text-text-muted">{step.output}</p>
                  )}
                  {step.error && (
                    <p className="mt-0.5 text-xs text-red-300">{step.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {task.result && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-200">
          <span className="font-medium">Result: </span>{task.result}
        </div>
      )}

      {/* Error */}
      {task.error && (
        <div className="rounded border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          <span className="font-medium">Error: </span>{task.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {(task.phase === 'planning' || task.phase === 'checkpoint' || task.phase === 'executing') && (
          <button
            type="button"
            onClick={() => cancelTask(task.id)}
            className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
          >
            <Square size={12} />
            Cancel
          </button>
        )}
        {(task.phase === 'completed' || task.phase === 'failed' || task.phase === 'cancelled') && (
          <button
            type="button"
            onClick={() => { deleteTask(task.id); selectTask(null); }}
            className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task list item
// ---------------------------------------------------------------------------

function TaskListItem({ task, isSelected }: { task: PcaeTask; isSelected: boolean }) {
  const selectTask = usePcaeStore((s) => s.selectTask);

  return (
    <button
      type="button"
      onClick={() => selectTask(task.id)}
      className={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-border-default bg-surface-secondary hover:bg-surface-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{task.title}</span>
        <PhaseBadge phase={task.phase} />
      </div>
      <p className="line-clamp-2 text-xs text-text-muted">{task.goal}</p>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
        {task.steps.length > 0 && (
          <span>{task.steps.filter((s) => s.status === 'completed').length}/{task.steps.length} steps</span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main CoWorkPanel
// ---------------------------------------------------------------------------

export function CoWorkPanel() {
  const tasks = usePcaeStore((s) => s.tasks);
  const selectedTaskId = usePcaeStore((s) => s.selectedTaskId);
  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : undefined),
    [selectedTaskId, tasks],
  );
  const pendingApprovalTasks = useMemo(
    () => tasks.filter((task) => task.phase === 'checkpoint' && task.checkpoints.some((cp) => !cp.approvedAt && !cp.rejectedAt)),
    [tasks],
  );
  const activeTasks = useMemo(
    () => tasks.filter((task) =>
      task.phase === 'planning' ||
      task.phase === 'checkpoint' ||
      task.phase === 'approved' ||
      task.phase === 'executing'),
    [tasks],
  );

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'workiq'>('tasks');

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left pane: task list */}
      <div className="flex h-full w-72 shrink-0 flex-col border-r border-border-default bg-surface-secondary">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">CoWork</span>
          </div>
          <div className="flex items-center gap-1">
            {pendingApprovalTasks.length > 0 && (
              <span className="rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                {pendingApprovalTasks.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowNewTaskForm(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              title="New task"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex border-b border-border-default">
          <button
            type="button"
            onClick={() => setActiveView('tasks')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
              activeView === 'tasks'
                ? 'border-b-2 border-blue-400 text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <ListTodo size={12} />
            Tasks
            {activeTasks.length > 0 && (
              <span className="rounded-full bg-surface-tertiary px-1.5 text-[10px]">{activeTasks.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('workiq')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
              activeView === 'workiq'
                ? 'border-b-2 border-blue-400 text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Search size={12} />
            Work IQ
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {activeView === 'workiq' ? (
            <WorkIqQueryWidget />
          ) : (
            <div className="flex flex-col gap-2">
              {showNewTaskForm && (
                <NewTaskForm onCancel={() => setShowNewTaskForm(false)} />
              )}
              {tasks.length === 0 && !showNewTaskForm ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Play size={32} className="text-text-muted opacity-30" />
                  <p className="text-sm text-text-muted">No tasks yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(true)}
                    className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-tertiary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
                  >
                    <Plus size={12} />
                    Create your first task
                  </button>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    isSelected={task.id === selectedTaskId}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right pane: task detail */}
      <div className="flex min-w-0 flex-1 flex-col bg-surface-primary">
        {selectedTask ? (
          <TaskDetail task={selectedTask} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Activity size={48} className="text-text-muted opacity-20" />
            <div>
              <p className="text-base font-medium text-text-secondary">Copilot CoWork</p>
              <p className="mt-1 text-sm text-text-muted">
                Plan-Checkpoint-Approve-Execute background tasks.
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Select a task from the list or create a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
