---
sidebar_position: 4
title: VS Code web
---

# VS Code web

The VS Code tab embeds `vscode.dev` inside the workbench. It is driven by `src-tauri/src/vscode.rs` for path-open commands and by direct webview navigation for everything else.

## What it can do

- Open a file path from another tab via the `@vscode open <path>` agent.
- Use the full VS Code web feature set inside the tab.
- Be opened/closed/replaced like any other tab.

## What it cannot do

- Save files back to disk through `vscode.dev`. Use `@terminal` for shell-level file operations.
- Run language servers that require local extensions. For that, run a local VS Code Server and point the embed at it.
