---
sidebar_position: 1
title: Overview
---

# Integrations

The workbench integrates with external systems through a small set of typed surfaces. Each integration corresponds to either a Rust module under `src-tauri/src/` or a frontend module under `src/lib/`.

| Integration | Surface | Purpose |
| --- | --- | --- |
| [MCP](./mcp) | `src/lib/mcpRegistry.ts` | Tool invocation protocol |
| [Browser sidecar](./browser-sidecar) | CopilotBrowser process | Web automation |
| [VS Code web](./vscode-web) | `src-tauri/src/vscode.rs` | Embedded `vscode.dev` |
| [Terminal](./terminal) | `src-tauri/src/terminal.rs` | PowerShell execution |
| [Entra SSO](./entra-sso) | identity façade | Interactive sign-in |
| [Key Vault](./key-vault) | secret resolver | `vault://` URI resolution |
