---
sidebar_position: 2
title: '@browser'
---

# @browser

Routes to the CopilotBrowser sidecar over MCP.

## Commands

| Form | Tool | Arguments |
| --- | --- | --- |
| `@browser navigate to <url>` | `browser_navigate` | `url` |
| `@browser click <selector>` | `browser_click` | `selector` |
| `@browser fill <selector> <text>` | `browser_fill` | `selector`, `text` |
| `@browser screenshot` | `browser_screenshot` | — |
| `@browser snapshot` | `browser_snapshot` | — |

## Examples

```text
@browser navigate to https://github.com/dayour/copilothub
@browser snapshot
@browser fill #search "tauri"
@browser click button[type=submit]
@browser screenshot
```

## Modes

The sidecar can run in two modes:

- **Headed** — visible browser window the user can also drive.
- **Headless** — for unattended automation.

Switching modes is done at sidecar start time, not per command.

## Errors

If the sidecar is not running, the command fails with `sidecar_unavailable`. Use the workbench status indicator to verify the sidecar is alive; the Rust core supervises it via `process.rs`.
