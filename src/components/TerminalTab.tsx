import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import "@xterm/xterm/css/xterm.css";

interface TerminalTabProps {
  isActive?: boolean;
}

export function TerminalTab(_props: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, Courier New, monospace",
      fontSize: 13,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#cccccc",
        selectionBackground: "#264f78",
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
      terminal.write(data);
    };

    const onStderr = (data: string) => {
      terminal.write(data);
    };

    const onClose = (payload: { code: number | null; signal: number | null }) => {
      terminal.write(
        `\r\n\r\n[Process exited with code ${payload.code ?? "null"}${
          payload.signal !== null ? `, signal ${payload.signal}` : ""
        }]\r\n`,
      );
    };

    const onError = (error: string) => {
      terminal.write(`\r\n\r\n[Terminal process error] ${error}\r\n`);
    };

    const command = Command.create("powershell", ["-NoLogo", "-NoProfile"]);
    command.stdout.on("data", onStdout);
    command.stderr.on("data", onStderr);
    command.on("close", onClose);
    command.on("error", onError);

    const inputDisposable = terminal.onData((data) => {
      if (!child) {
        return;
      }

      void child.write(data).catch((error) => {
        terminal.write(`\r\n[stdin write failed] ${String(error)}\r\n`);
      });
    });

    void command
      .spawn()
      .then((spawnedChild) => {
        child = spawnedChild;
      })
      .catch((error) => {
        terminal.write(`\r\n[Failed to spawn PowerShell] ${String(error)}\r\n`);
      });

    return () => {
      resizeObserver.disconnect();
      inputDisposable.dispose();

      command.stdout.off("data", onStdout);
      command.stderr.off("data", onStderr);
      command.off("close", onClose);
      command.off("error", onError);

      if (child) {
        void child.kill().catch(() => {
          // no-op on cleanup
        });
      }

      terminal.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default TerminalTab;

