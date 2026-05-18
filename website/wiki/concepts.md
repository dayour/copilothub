---
sidebar_position: 1
title: Concepts
---

# Concepts

These are the load-bearing concepts in CopilotHub. Each one corresponds to real code in the repository.

## Workbench

CopilotHub is a single native desktop window that hosts multiple tabs. Each tab is a typed surface (`browser`, `chat`, `terminal`, `vscode`, `runbook`). The term **workbench** is used deliberately: it is a place to do work with multiple tools open at the same time, not a hosted service.

## Tab

A first-class container with a type, a state, and a render contract. Tabs are managed in `chatStore.ts` and rendered through dedicated components in `src/components/`.

## Action mode

The chat tab has two modes:

- **Chat** — natural-language response.
- **Action** — input is parsed with `parseActionCommand` and dispatched to a tool route.

Action mode is enabled per message; it does not change the rest of the workbench state.

## @mention

An identifier in action mode that maps to a tool family:

- `@browser` → CopilotBrowser sidecar tools
- `@terminal` → shell execution
- `@vscode` → VS Code web tab control
- `@runbook` → runbook executor

See [Agents](/agents/overview) for the full reference.

## Runbook

A YAML document parsed by `src/lib/runbookExecutor.ts` and executed step-by-step. Runbooks support variables, MCP calls, shell commands, error policies, and retries. See [Runbook schema](/docs/runbook-schema).

## Sidecar

A separate process started and supervised by the Rust core. The sidecar exposes MCP tools over local HTTP + SSE. The workbench depends on the sidecar for browser automation features. See [Integrations: Browser sidecar](/integrations/browser-sidecar).

## MCP (Model Context Protocol)

The protocol used to invoke tools from the chat tab and from runbooks. The workbench bundles an MCP registry (`src/lib/mcpRegistry.ts`) that lists configured servers, their tools, and their transport endpoints.

## Capability

A Tauri 2 permission name. The workbench requests an explicit set; anything outside the set is denied. See [Security](/docs/security).
