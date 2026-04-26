import type {
  SessionEnvironmentInput,
  SessionSandboxMode,
  SessionShellType,
} from './sessionEnvironment';
import { getPathBaseName, resolveDefaultProjectPath } from './sessionEnvironment';

export interface SessionThread {
  id: string;
  title: string;
  projectPath: string;
  sessionEnvironmentId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionThreadInput {
  id?: string;
  title?: string;
  projectPath?: string;
  sessionEnvironmentId: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CreateSessionThreadInput
  extends Omit<
    SessionEnvironmentInput,
    'id' | 'name' | 'createdAt' | 'updatedAt'
  > {
  title?: string;
  projectPath?: string;
  shellType?: SessionShellType;
  sandboxMode?: SessionSandboxMode;
}

export function getDefaultThreadTitle(projectPath: string): string {
  const projectLabel = getPathBaseName(projectPath);
  return projectLabel ? `${projectLabel} Main` : 'Main Thread';
}

export function createSessionThread(
  input: SessionThreadInput,
): SessionThread {
  const now = Date.now();
  const projectPath = input.projectPath?.trim() ?? resolveDefaultProjectPath();
  const createdAt = input.createdAt ?? now;

  return {
    id: input.id ?? crypto.randomUUID(),
    title: input.title?.trim() || getDefaultThreadTitle(projectPath),
    projectPath,
    sessionEnvironmentId: input.sessionEnvironmentId,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}
