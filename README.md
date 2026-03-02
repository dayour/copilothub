# CopilotHub -- Enterprise Agentic Desktop OS

All-in-one enterprise desktop application built with Tauri 2.x + WebView2 that unifies browser, IDE, terminal, AI chat, and agent browser control in a single native window.

## Architecture

```
+---------------------------------------------------------------+
|  CopilotHub (Tauri 2.x Native Window)                         |
|  +----------------------------------------------------------+ |
|  | TitleBar  |  Tab Bar (Browser | Chat | IDE | Terminal)    | |
|  +----------------------------------------------------------+ |
|  | Address Bar (browser tabs only)                           | |
|  +----------------------------------------------------------+ |
|  |                                                            | |
|  |  Tab Content Area                                          | |
|  |  - Browser tabs: iframe/WebView2 instances                 | |
|  |  - Chat tab: ChatMessageList + ChatInput (persistent)      | |
|  |  - VS Code tab: vscode.dev embedded                        | |
|  |  - Terminal tab: xterm.js + PowerShell                     | |
|  |  - Runbook tab: marketplace UI                             | |
|  |                                                            | |
|  +----------------------------------------------------------+ |
|  |                                   | Copilot Sidebar (opt) | |
+--+-----------------------------------+-----------------------+-+
        |                    |
   Tauri IPC            Sidecar Mgmt
        |                    |
+---------------------------------------------------------------+
|  Rust Core (src-tauri/)                                       |
|  - Sidecar lifecycle, window management, plugin orchestration |
+---------------------------------------------------------------+
        |
+---------------------------+  +----------------------------+
| CopilotBrowser Sidecar    |  | PAC MCP / Agent 365        |
| (Playwright fork, MCP)    |  | (Managed child processes)  |
+---------------------------+  +----------------------------+
```

## Features

- **Multi-Tab Browser** -- Edge-like UX with horizontal/vertical tabs, address bar, context menu, favicon, history navigation
- **Copilot-Style Chat** -- Persistent chat tab with Chat mode (LLM conversation) and Action mode (MCP tool invocation)
- **MCP Action Mode** -- Parse `@browser`, `@terminal`, `@vscode`, `@runbook` commands and route to MCP tools
- **Terminal** -- xterm.js embedded terminal with PowerShell via Tauri shell plugin
- **VS Code Web** -- Embedded IDE tab loading vscode.dev
- **Runbook System** -- YAML schema, parser, executor engine, and marketplace UI for shareable automation workflows
- **Command Palette** -- Ctrl+Shift+P with fuzzy search across 15+ commands in 4 categories
- **Theme System** -- Edge Dark (default), Edge Light, Enterprise Blue, System auto-detect
- **Keyboard Shortcuts** -- Full shortcut set (Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+Shift+E, F5, etc.)
- **CopilotBrowser Sidecar** -- Playwright-based browser automation with MCP server, Follow Me recording, CDP relay
- **Entra SSO** -- Microsoft Entra ID authentication facade with Azure Key Vault secret resolution
- **Copilot Sidebar** -- Quick chat, recent activity feed, sidecar status panel
- **MSIX/NSIS Installer** -- Intune-ready distribution targeting Windows x86_64

## Getting Started

### Prerequisites

- Node.js 22+
- Rust 1.93+ with `rustfmt` component
- Tauri CLI 2.x (`npm install -g @tauri-apps/cli`)
- Windows 11 with WebView2 runtime (included with Edge)

### Development

```bash
cd E:\copilothub
npm install
npm run tauri dev
```

### Production Build

```bash
npm run tauri build --target x86_64-pc-windows-msvc
```

Output: `src-tauri/target/release/bundle/` (NSIS installer + MSI)

## Project Structure

```
E:\copilothub\
  src/
    components/        11 React components
      AddressBar.tsx       Edge-like navigation bar
      ChatInput.tsx        Chat input with @mention autocomplete
      ChatMessageList.tsx  Message display with markdown + code blocks
      CommandPalette.tsx   Ctrl+Shift+P fuzzy command search
      CopilotSidebar.tsx   Right-side quick-access panel
      NewTabPage.tsx       Welcome page for new tabs
      RunbookMarketplace.tsx  Browse/run/edit runbooks
      TabBar.tsx           Horizontal + vertical tab bar
      TabContextMenu.tsx   Right-click tab menu
      TerminalTab.tsx      xterm.js + PowerShell
      TitleBar.tsx         Custom frameless titlebar
      VSCodeTab.tsx        VS Code web embedding
    hooks/             4 custom React hooks
      useChat.ts           Chat + eventBridge + actionMode bridge
      useEntraAuth.ts      Entra SSO initialization
      useKeyboardShortcuts.ts  Global keyboard shortcuts
      useTheme.ts          Theme application
      useSidecar.ts        Sidecar auto-start on launch
    lib/               7 library modules
      actionMode.ts        @mention command parser + executor
      entraAuth.ts         Entra SSO facade + Key Vault resolver
      eventBridge.ts       Tauri IPC event bridge for streaming chat
      mcpClient.ts         HTTP/SSE MCP client for sidecar
      runbookExecutor.ts   Runbook step-by-step execution engine
      runbookParser.ts     YAML parser + schema validator
      runbookStorage.ts    Local file-based runbook CRUD
    store/             3 Zustand stores
      appStore.ts          Theme, layout, sidecar status
      chatStore.ts         Messages, streaming, tool calls
      tabStore.ts          Tab lifecycle, navigation history
    types/             TypeScript type definitions
      runbook.ts           Runbook YAML schema types
    styles/
      globals.css          Tailwind CSS + theme tokens
  src-tauri/
    src/
      lib.rs               Tauri app builder + plugin registration
      sidecar.rs           Sidecar lifecycle management commands
    capabilities/          Tauri permission manifest
    tauri.conf.json        App config, MSIX/NSIS bundle settings
  sample-runbooks/     3 example YAML runbooks
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+T | New browser tab |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+1..9 | Switch to tab by index |
| Ctrl+Shift+P | Command palette |
| Ctrl+Shift+E | Toggle vertical tabs |
| Ctrl+Shift+C | Focus chat tab |
| Ctrl+` | Toggle terminal |
| F5 | Refresh browser tab |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Shell | Tauri 2.x (Rust core, WebView2 rendering) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 4 + custom theme tokens |
| State | Zustand + immer |
| Terminal | xterm.js + @xterm/addon-fit |
| Sidecar | CopilotBrowser (Playwright fork with MCP server) |
| Auth | MSAL.js / @azure/identity (via sidecar) |
| Secrets | Azure Key Vault (memory-only, zero-disk) |
| Icons | lucide-react |
| Build | Vite + Rollup (code-split into 6 chunks) |
| Package | NSIS + MSI via Tauri bundler |

## License

Apache-2.0
