---
sidebar_position: 3
title: Browser sidecar
---

# Browser sidecar (CopilotBrowser)

A separate process spawned by the Rust core. It exposes browser-automation tools as an MCP server on `127.0.0.1`.

## Capabilities

- Navigate, click, fill, screenshot, snapshot.
- Headless and headed modes.
- **Follow Me** — mirrors user actions in the host browser tab into the automated browser context for instruction recording.
- **CDP relay** — connects to an existing Chrome DevTools Protocol session.

## Lifecycle

The Rust core supervises the sidecar via the shared helpers in `src-tauri/src/process.rs`:

- `is_process_alive(pid) -> bool` — process probe.
- `shutdown_process(pid)` — cooperative shutdown with a forced fallback.

Three Tauri commands expose the lifecycle to the frontend:

- `start_sidecar`
- `stop_sidecar`
- `sidecar_status`

## Boundary

The sidecar binds only to `127.0.0.1`. No external traffic terminates at the sidecar. If the workbench exits, the sidecar is terminated; there is no orphaned process surface.
