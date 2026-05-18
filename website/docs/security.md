---
sidebar_position: 5
title: Security
---

# Security

CopilotHub is a desktop application that touches the network, the filesystem, and the user's shell. The security model is built on three concentric boundaries.

## 1. Tauri capability model

Tauri 2 uses an explicit allow-list of capabilities. Anything not listed in `src-tauri/capabilities/` is denied. The workbench requests the minimum set required for its features:

- `shell:default` — execute the configured PowerShell command, with arguments validated server-side.
- `fs:scope` — read and write only within user-approved directories.
- `http:default` — outbound HTTP only to allow-listed hosts.
- `dialog:default` — system file pickers (no silent reads).

Capabilities are reviewed on every release. The current set lives in `src-tauri/capabilities/default.json`.

## 2. Sidecar process boundary

Browser automation runs in a separate **CopilotBrowser sidecar** process. The sidecar:

- Binds to `127.0.0.1` only; never accepts external connections.
- Exposes an MCP-compatible HTTP + SSE endpoint.
- Is started, monitored, and terminated by the Rust core via the helpers in `src-tauri/src/process.rs` (`is_process_alive`, `shutdown_process`).

If the workbench process exits or crashes, the sidecar is terminated. There is no orphaned process surface.

## 3. Identity and secrets

The workbench does not embed credentials. Two thin abstractions cover enterprise identity:

- **Entra SSO façade** — delegates interactive sign-in to the OS-provided account broker. No token is persisted to disk.
- **Azure Key Vault resolver** — secrets are referenced by URI (`https://<vault>.vault.azure.net/secrets/<name>`); resolution happens at use time using the signed-in identity.

## Reporting issues

Security issues are accepted on the [Forum](https://github.com/dayour/copilothub/discussions) under the Security category, or as a private advisory via GitHub. Do not file public issues for unpatched vulnerabilities.

## Build provenance

Release builds publish SHA-256 hashes of the NSIS and MSI artifacts in the [Releases](https://github.com/dayour/copilothub/releases) section.
