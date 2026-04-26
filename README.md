# CopilotHub -- Enterprise Agentic Desktop OS

## Overview

CopilotHub is an all-in-one enterprise desktop application built with Tauri 2.x and WebView2. It unifies browser navigation, IDE workflows, terminal execution, AI chat, and agent-driven browser control inside a single native desktop window.

## Architecture

```text
+------------------------------------------------------------------------------------+
|                          Tauri 2.x Native Window (WebView2)                       |
|                                                                                    |
|  React Frontend                                                                    |
|  - TitleBar, TabBar, AddressBar                                                    |
|  - Browser tabs, Chat tab (Chat/Action), Terminal tab, VS Code tab, Runbook tab   |
|  - CommandPalette, CopilotSidebar, Theme + Shortcut handling                       |
|                                                                                    |
+----------------------------------------+-------------------------------------------+
                                         |
                                         | Tauri IPC / Events
                                         v
+------------------------------------------------------------------------------------+
|                             Rust Core (src-tauri)                                  |
|  - Window lifecycle, plugin registration, command handlers                         |
|  - Sidecar lifecycle commands (start_sidecar, stop_sidecar, sidecar_status)        |
|  - Security policy and bundling configuration                                       |
+----------------------------------------+-------------------------------------------+
                                         |
                 +-----------------------+--------------------------+
                 |                                                  |
                 v                                                  v
+----------------------------------------------+     +----------------------------------+
| CopilotBrowser Sidecar (MCP server)          |     | Identity + Secrets Integration   |
| - Browser automation tools                    |     | - Entra SSO facade               |
| - Follow Me / CDP relay / headless/headed    |     | - Azure Key Vault resolver       |
| - HTTP + SSE endpoints on localhost          |     | - Enterprise auth boundary        |
+----------------------------------------------+     +----------------------------------+
```

## Features

- **Multi-tab browser**: Edge-like UX with horizontal or vertical tabs, address bar, history navigation, and tab context menu.
- **Copilot-style chat**: Dedicated chat tab with **Chat** and **Action** modes, streaming responses, and persistent conversation state.
- **MCP action mode**: `@mentions` (such as `@browser`, `@terminal`, `@vscode`, `@runbook`) route commands to MCP-backed tools.
- **Terminal**: Embedded xterm.js terminal experience with PowerShell integration via Tauri shell plugin.
- **VS Code web**: Embedded IDE tab for vscode.dev.
- **Runbook system**: YAML schema + parser + executor + marketplace UI for reusable operational workflows.
- **Command palette**: `Ctrl+Shift+P` for fast command discovery and execution.
- **Theme system**: Dark, Light, and Enterprise Blue themes with system-theme support.
- **Keyboard shortcuts**: Global productivity shortcuts for tab, layout, chat, and terminal workflows.
- **CopilotBrowser sidecar**: MCP-capable browser control service with Follow Me, CDP relay, and headless/headed operation patterns.
- **Entra SSO + Azure Key Vault**: Enterprise identity and secret management abstraction layer.
- **MSIX/NSIS installer**: Windows enterprise packaging model suitable for Intune-managed environments.

## Getting Started

### Prerequisites

- Node.js 22+
- Rust 1.93+
- Tauri CLI 2.x

### Run in development

```bash
cd E:\copilothub
npm install
npm run tauri dev
```

## Building

```bash
npm run tauri build --target x86_64-pc-windows-msvc
```

## Project Structure

```text
E:\copilothub\
├─ src/                          # React frontend
│  ├─ components/                # UI modules (tabs, chat, terminal, palette, sidebar)
│  ├─ hooks/                     # App behavior hooks (chat, sidecar, shortcuts, theme, auth)
│  ├─ lib/                       # Core TS logic (MCP client, action parser, runbook engine)
│  ├─ store/                     # Zustand stores (app/chat/tab state)
│  ├─ styles/                    # Global styles and theme tokens
│  └─ types/                     # Shared TypeScript types
├─ src-tauri/                    # Rust core + Tauri config
│  ├─ src/                       # Rust commands and runtime wiring
│  ├─ capabilities/              # Tauri permission/capability manifests
│  ├─ sidecars/                  # Sidecar assets/binaries
│  └─ tauri.conf.json            # App/window/security/bundle settings
├─ sample-runbooks/              # YAML runbook examples
├─ public/                       # Static assets
└─ package.json                  # Frontend scripts and dependencies
```

## Keyboard Shortcuts

| Shortcut | Scope | Action |
|---|---|---|
| `Ctrl+T` | Global | Open new browser tab |
| `Ctrl+W` | Global | Close current tab |
| `Ctrl+Tab` | Global | Switch to next tab |
| `Ctrl+Shift+Tab` | Global | Switch to previous tab |
| `Ctrl+1..9` | Global | Jump to tab index |
| `Ctrl+Shift+P` | Global | Open command palette |
| `Ctrl+Shift+E` | Global | Toggle vertical tabs |
| `Ctrl+Shift+C` | Global | Focus chat tab |
| `Ctrl+\`` | Global | Open/focus terminal tab |
| `F5` | Browser tab | Refresh current browser tab |
| `Enter` | Chat input | Send message |
| `Shift+Enter` | Chat input | Insert newline |
| `Esc` | Chat input | Clear current draft / dismiss mention state |
| `Arrow Up/Down` | Palette or mention list | Navigate command/mention selection |
| `Tab` | Mention list | Accept selected mention |

## Configuration

### `src-tauri/tauri.conf.json` settings

- **Window shell**: frameless window (`decorations: false`), default size `1400x900`, title `CopilotHub`.
- **Security CSP**: allows app resources, HTTPS/WSS, and localhost connectivity required for MCP sidecar communication.
- **Build pipeline**: `beforeDevCommand` and `beforeBuildCommand` wire frontend build/dev into Tauri lifecycle.
- **Bundle targets**: configured for `nsis` and `msi` outputs.

### Theme customization

- Themes are controlled from:
  - `src/store/appStore.ts` (theme state model)
  - `src/hooks/useTheme.ts` (runtime theme application)
  - `src/styles/globals.css` (token definitions)
- Built-in theme options:
  - `dark`
  - `light`
  - `enterprise-blue`
  - `system` (maps to OS preference)

### Sidecar configuration

- Sidecar lifecycle commands are exposed by Rust in `src-tauri/src/sidecar.rs`.
- Default MCP client endpoint is configured in `src/lib/mcpClient.ts`:
  - host: `localhost`
  - port: `3000`
  - timeout: `30000ms`
- Auto-start behavior is initialized in `src/hooks/useSidecar.ts`.

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Native shell | Tauri 2.x + Rust | Minimal footprint desktop runtime with secure IPC and native packaging |
| Rendering engine | WebView2 | Enterprise-standard Windows web runtime integration |
| Frontend UI | React 19 + TypeScript + Vite | Fast iteration, type safety, and modular component architecture |
| State management | Zustand + immer | Lightweight predictable app/chat/tab state transitions |
| Styling | Tailwind CSS 4 + CSS tokens | Consistent theming and rapid UI composition |
| Terminal | xterm.js + PowerShell | In-app shell workflows for ops and developer automation |
| Agent tooling bridge | MCP client over HTTP/SSE | Structured invocation of sidecar tools with streaming support |
| Browser automation | CopilotBrowser sidecar (Playwright-based MCP server) | Agentic browser control and automation extensibility |
| Identity and secrets | Entra SSO facade + Azure Key Vault resolver | Enterprise auth posture and managed secret access patterns |
| Packaging | Tauri bundler (MSI/NSIS) | Windows enterprise deployment readiness (including Intune scenarios) |

## License

Apache-2.0 (matching CopilotBrowser fork)
