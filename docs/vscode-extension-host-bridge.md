# VS Code Extension Host Bridge Foundation

CopilotHub now discovers unpacked local VS Code extensions from a workspace-relative directory:

- Default directory: `.copilothub/extensions`
- Optional override: `COPILOTHUB_VSCODE_EXTENSIONS_DIR`
  - Absolute paths are used directly.
  - Relative paths are resolved from the current project path.

## What is implemented

- Tauri bridge commands:
  - `vscode_extension_list`
  - `vscode_extension_host_status`
- Typed extension metadata model including:
  - identity, version, display name, description
  - activation events
  - `main` and `browser` entry points
  - command, language, debugger, and view contribution counts
  - manifest warnings for incomplete metadata
- VS Code tab status surface showing:
  - extension directory resolution
  - discovered extension count
  - host readiness state
  - staged execution mode

## Expected directory layout

```text
<project>\
  .copilothub\
    extensions\
      my-extension\
        package.json
        README.md
        dist\
```

Each child directory is treated as an unpacked extension candidate and must contain a `package.json` manifest.

NOTE: Symlinked or junctioned child folders are skipped during discovery. Copy or unpack the real extension folder into the configured directory instead.

## Remaining gaps to full execution

The current bridge is intentionally useful but not complete. Remaining work includes:

1. Starting or attaching a dedicated VS Code extension host runtime.
2. Wiring discovered manifests into the local VS Code server launch path so extensions are actually activated.
3. Supporting VSIX installation, enable/disable state, and lifecycle management.
4. Adding permission and sandbox controls for extension execution.
5. Surfacing extension runtime logs, crashes, and activation failures back into CopilotHub.
