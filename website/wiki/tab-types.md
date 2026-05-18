---
sidebar_position: 4
title: Tab types
---

# Tab types

CopilotHub tabs are typed. Each type has its own component, its own state slice, and its own keyboard surface.

| Type | Component | Purpose |
| --- | --- | --- |
| `browser` | `BrowserTab` + `AddressBar` | Edge-style multi-tab browser with history navigation and tab context menu. |
| `chat` | `ChatInput`, `ChatMessageList` | Conversational chat with two modes (chat / action) and `@mention` routing. |
| `terminal` | `TerminalTab` | xterm.js terminal wired to PowerShell via the Tauri shell plugin. |
| `vscode` | `VSCodeTab` | Embedded vscode.dev IDE surface. |
| `runbook` | `RunbookMarketplace`, `RunbookRunner` | Browse, inspect, and execute YAML runbooks. |

## Layout

Tabs can be displayed horizontally (default) or vertically. Layout is persisted across sessions. The command palette (`Ctrl+Shift+P`) can switch layout, open a new tab of any type, or jump to a specific tab by name.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+L` | Focus address bar |
| `Ctrl+\`` | Toggle terminal tab |
