---
sidebar_position: 5
---

# Recording

CopilotHub supports two capture flows: one-shot **screenshots** and **follow-me recordings** that replay browser interactions.

## Screenshots

Triggered manually or automatically while the workbench drives a browser session.

| Trigger | Source |
| --- | --- |
| Command palette: `Browser: Take Screenshot` | `CommandPalette` |
| Keyboard: `Ctrl + Shift + S` | `useKeyboardShortcuts` |
| Sidebar button | `CopilotSidebar` |
| Runbook step: `browser.screenshot` | `runbookExecutor` |
| Auto-capture after browser actions | `browserUseAutoScreenshot` setting (default on) |

Captures route through the `browser_screenshot` MCP tool. Each result attaches a blob URL to the action store (decoded from base64), and the bytes are also persisted to disk when `browserUsePersistScreenshots` is enabled (default on).

### Storage

Screenshots write to the same location Snipping Tool uses, in a CopilotHub subfolder:

```
%USERPROFILE%\Pictures\Screenshots\CopilotHub\
```

Filenames follow the Snipping Tool pattern:

```
Screenshot 2026-05-18 094312.png
```

## Follow-me recordings

A recording captures the live sequence of browser interactions and asks the MCP server to produce equivalent replay code (JavaScript by default). Recordings can be replayed later, copied as code, or deleted.

| Trigger | Source |
| --- | --- |
| Command palette: `Browser: Start Recording` / `Stop Recording` / `Replay Last Recording` | `CommandPalette` |
| Keyboard: `Ctrl + Alt + R` (toggles start/stop) | `useKeyboardShortcuts` |
| Recordings panel | `RecordingsPanel` |
| Recording indicator (titlebar) | `RecordingIndicator` |

The recorder wraps the `browser_follow_me_start`, `browser_follow_me_stop`, and `browser_follow_me_replay` MCP tools.

### Storage

Recordings persist alongside Clipchamp output, under a CopilotHub subfolder:

```
%USERPROFILE%\Videos\CopilotHub\
```

Each recording produces two files that share a base name:

```
Recording 2026-05-18 094312.json   manifest (id, name, start/stop, language)
Recording 2026-05-18 094312.js     replay code returned by the MCP server
```

The recordings panel reads manifests on demand, lets you reveal individual files in Explorer, and exposes replay, copy-code, and delete actions.

## Settings

`Settings -> Browser automation defaults`:

- **Capture automatic screenshots** — toggle the auto-capture after each browser action.
- **Save screenshots to disk** — toggle persistence to `Pictures\Screenshots\CopilotHub\`.
- **Maximum browser steps** — safety limit applied to orchestrated runs.

## Permissions

The Tauri capability set in `src-tauri/capabilities/default.json` grants the workbench access to:

- `fs:allow-write-file`, `fs:allow-read-file`, `fs:allow-remove` — required to persist and prune captures.
- `fs:allow-mkdir`, `fs:allow-exists`, `fs:allow-read-dir` — required to create capture directories on first use and list saved recordings.
- `opener:default` — used to open the capture folders or reveal individual files in Explorer.
