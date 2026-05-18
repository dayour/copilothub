---
sidebar_position: 2
title: Architecture
---

# Architecture

CopilotHub is a single Tauri 2 desktop window. The React frontend renders the UI; the Rust core handles the window lifecycle, plugin registration, and command handlers; a long-lived sidecar process exposes browser-automation tools over MCP.

## Top-level diagram

```text
+----------------------------------------------------------------------------+
|                       Tauri 2.x Native Window (WebView2)                  |
|                                                                            |
|  React Frontend (src/)                                                     |
|  - TitleBar, TabBar, AddressBar                                            |
|  - Browser tabs, Chat tab, Terminal tab, VS Code tab, Runbook tab          |
|  - CommandPalette, CopilotSidebar, Theme + Shortcut handling               |
|                                                                            |
+--------------------------------+-------------------------------------------+
                                 |
                                 | Tauri IPC + events
                                 v
+----------------------------------------------------------------------------+
|                          Rust Core (src-tauri/src/)                       |
|  - Window lifecycle, plugin registration, command handlers                 |
|  - Sidecar lifecycle (start_sidecar, stop_sidecar, sidecar_status)         |
|  - Process helpers (process.rs), sandbox (sandbox.rs), terminal, vscode    |
+--------------------------------+-------------------------------------------+
                                 |
              +------------------+-------------------+
              |                                      |
              v                                      v
+--------------------------------+     +-------------------------------+
| CopilotBrowser sidecar (MCP)   |     | Identity + Secrets            |
| - Browser automation tools      |     | - Entra SSO facade            |
| - Follow Me / CDP relay        |     | - Azure Key Vault resolver    |
| - HTTP + SSE on localhost      |     | - Enterprise auth boundary    |
+--------------------------------+     +-------------------------------+
```

## Frontend layout

- `src/components/` — React 19 components (TitleBar, TabBar, AddressBar, ChatInput, ChatMessageList, CopilotSidebar, CommandPalette, RunbookMarketplace, NewTabPage).
- `src/hooks/` — runtime hooks; `useChat.ts` owns conversation state and routes `@mention` commands.
- `src/lib/` — pure logic (action parser, runbook executor, MCP registry, URL safety).
- `src/store/` — Zustand stores (`chatStore.ts`, others).
- `src/styles/globals.css` — brand palette tokens and theme variables.

## Rust core layout

| File | Responsibility |
| --- | --- |
| `lib.rs` | Tauri builder, plugin registration, command registration |
| `main.rs` | Entry point |
| `process.rs` | Shared helpers: `is_process_alive`, `shutdown_process`, unit tests |
| `sidecar.rs` | Sidecar process management (start/stop/status) |
| `browser.rs` | Browser command handlers |
| `terminal.rs` | Terminal command handlers (PowerShell via shell plugin) |
| `vscode.rs` | VS Code web embed command handlers |
| `sandbox.rs` | Sandboxed execution helpers |
| `streamable_http_server.rs` | Local HTTP + SSE for streaming responses |

## Tabs and modes

Tabs are typed: `browser`, `chat`, `terminal`, `vscode`, `runbook`. The chat tab has two modes:

- **Chat** — conversational response.
- **Action** — `@mention` parser routes commands to MCP tools (see [Agents](/agents/overview)).

## Data flow

```
User input -> ChatInput -> parseActionCommand (action mode)
                          \-> chatStore -> useChat -> MCP call
                                                  \-> tool result -> ChatMessageList
```
