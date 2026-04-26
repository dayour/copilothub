import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Command, type Child } from '@tauri-apps/plugin-shell';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../store/appStore';
import type { SessionShellType } from '../lib/sessionEnvironment';
import { isTauri } from '../lib/tauri';
import {
  fetchTerminalShellCatalog,
  resolveTerminalShellSelection,
  type TerminalShellCatalogEntry,
} from '../lib/terminalShells';

interface TerminalTabProps {
  isActive?: boolean;
}

export function TerminalTab(_props: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preferredShell = useAppStore((state) => state.terminalShell);
  const persistTerminalShell = useAppStore((state) => state.setTerminalShell);
  const [selectedShell, setSelectedShell] = useState<SessionShellType>(preferredShell);
  const [shellCatalog, setShellCatalog] = useState<TerminalShellCatalogEntry[]>([]);
  const [isShellCatalogLoading, setIsShellCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setIsShellCatalogLoading(true);

      try {
        const catalog = await fetchTerminalShellCatalog();

        if (!cancelled) {
          setShellCatalog(catalog);
        }
      } finally {
        if (!cancelled) {
          setIsShellCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const shellSelection = useMemo(
    () => resolveTerminalShellSelection(selectedShell, shellCatalog),
    [selectedShell, shellCatalog],
  );

  const activeShell = shellSelection.activeShell;
  const selectValue = activeShell?.type ?? selectedShell;

  useEffect(() => {
    setSelectedShell(preferredShell);
  }, [preferredShell]);

  useEffect(() => {
    if (isShellCatalogLoading) {
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'Cascadia Code, Consolas, Courier New, monospace',
      fontSize: 13,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        selectionBackground: '#264f78',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);

    let child: Child | null = null;

    const onStdout = (data: string) => {
      try {
        terminal.write(data);
      } catch {
        // no-op to keep terminal alive on callback errors
      }
    };

    const onStderr = (data: string) => {
      try {
        terminal.write(data);
      } catch {
        // no-op to keep terminal alive on callback errors
      }
    };

    const onClose = (payload: { code: number | null; signal: number | null }) => {
      terminal.write(
        `\r\n\r\n[Process exited with code ${payload.code ?? 'null'}${
          payload.signal !== null ? `, signal ${payload.signal}` : ''
        }]\r\n`,
      );
    };

    const shellLabel = activeShell?.label ?? shellSelection.requestedShell.label;

    const onError = (error: string) => {
      terminal.write(`\r\n\r\n[Terminal process error: ${shellLabel}] ${error}\r\n`);
    };

    const inputDisposable = terminal.onData((data) => {
      if (!child) {
        return;
      }

      void child.write(data).catch((error) => {
        terminal.write(`\r\n[stdin write failed] ${String(error)}\r\n`);
      });
    });

    if (!activeShell?.command) {
      terminal.write(`\r\n[No supported terminal shell is available]\r\n`);

      if (shellSelection.notice) {
        terminal.write(`[${shellSelection.notice}]\r\n`);
      }

      return () => {
        try {
          resizeObserver.disconnect();
        } catch {
          // no-op on cleanup
        }

        try {
          inputDisposable.dispose();
        } catch {
          // no-op on cleanup
        }

        terminal.dispose();
      };
    }

    if (!isTauri) {
      terminal.write(
        '\r\n[Native terminal is only available inside the CopilotHub Tauri shell.]\r\n',
      );
      terminal.write(
        '[Browser-host mode cannot spawn local PowerShell, Command Prompt, or WSL processes.]\r\n',
      );

      return () => {
        try {
          resizeObserver.disconnect();
        } catch {
          // no-op on cleanup
        }

        try {
          inputDisposable.dispose();
        } catch {
          // no-op on cleanup
        }

        terminal.dispose();
      };
    }

    if (shellSelection.notice) {
      terminal.write(`\r\n[${shellSelection.notice}]\r\n\r\n`);
    }

    const command = Command.create(activeShell.command, activeShell.args);
    command.stdout.on('data', onStdout);
    command.stderr.on('data', onStderr);
    command.on('close', onClose);
    command.on('error', onError);

    void command
      .spawn()
      .then((spawnedChild) => {
        child = spawnedChild;
      })
      .catch((error) => {
        terminal.write(`\r\n[Failed to spawn ${shellLabel}] ${String(error)}\r\n`);
      });

    return () => {
      try {
        resizeObserver.disconnect();
      } catch {
        // no-op on cleanup
      }

      try {
        inputDisposable.dispose();
      } catch {
        // no-op on cleanup
      }

      try {
        command.stdout.off?.('data', onStdout);
      } catch {
        // no-op on cleanup
      }

      try {
        command.stderr.off?.('data', onStderr);
      } catch {
        // no-op on cleanup
      }

      try {
        command.off?.('close', onClose);
      } catch {
        // no-op on cleanup
      }

      try {
        command.off?.('error', onError);
      } catch {
        // no-op on cleanup
      }

      if (child) {
        try {
          void child.kill().catch(() => {
            // no-op on cleanup
          });
        } catch {
          // no-op on cleanup
        }
      }

      terminal.dispose();
    };
  }, [activeShell, isShellCatalogLoading, shellSelection.notice, shellSelection.requestedShell.label]);

  const handleShellChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextShell = event.target.value as SessionShellType;
    setSelectedShell(nextShell);
    persistTerminalShell(nextShell);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-primary">
      <div className="border-b border-default px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="terminal-shell-selector">
            Shell
          </label>
          <select
            id="terminal-shell-selector"
            aria-label="Terminal shell"
            value={selectValue}
            onChange={handleShellChange}
            disabled={isShellCatalogLoading || shellCatalog.length === 0}
            className="min-w-[14rem] rounded-lg border border-default bg-surface-secondary px-3 py-2 text-sm text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {shellCatalog.map((option) => (
              <option
                key={option.type}
                value={option.type}
                disabled={!option.available}
              >
                {option.available ? option.label : `${option.label} (Unavailable)`}
              </option>
            ))}
          </select>
          <span className="text-sm text-text-secondary">
            {isShellCatalogLoading
              ? 'Detecting installed shells.'
              : activeShell
                ? `Running ${activeShell.label}.`
                : 'No supported shell is available.'}
          </span>
        </div>
        {shellSelection.notice && !isShellCatalogLoading && (
          <p className="mt-2 text-sm text-amber-300">{shellSelection.notice}</p>
        )}
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
