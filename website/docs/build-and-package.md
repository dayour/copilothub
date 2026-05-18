---
sidebar_position: 3
title: Build and package
---

# Build and package

CopilotHub ships as a Windows desktop installer. The build produces two artifacts: an NSIS setup executable and a WiX MSI.

## Clean build

```powershell
Remove-Item -Recurse -Force dist, src-tauri\target\release\bundle -ErrorAction SilentlyContinue
npm run tauri -- build
```

A clean release build takes roughly 1m 45s on a recent workstation:

- Vite bundles the frontend to `dist/` (≈ 4–5 seconds).
- Rust compiles the release binary (≈ 1m 17s on first build, faster with cache).
- NSIS produces `src-tauri/target/release/bundle/nsis/copilothub_<version>_x64-setup.exe`.
- WiX produces `src-tauri/target/release/bundle/msi/copilothub_<version>_x64_en-US.msi`.

## Version bump

The version string lives in four files. Update them together:

```text
package.json                              "version": "x.y.z"
src-tauri/Cargo.toml                       version = "x.y.z"
src-tauri/tauri.conf.json                  "version": "x.y.z"
src/lib/config.ts                          version: 'x.y.z'
```

## Install location

The NSIS installer installs to `%LOCALAPPDATA%\copilothub\copilothub.exe`. The MSI defaults to the same path. The registry `InstallLocation` reflects the final directory.

## Silent install

```powershell
Start-Process -FilePath copilothub_x.y.z_x64-setup.exe -ArgumentList '/S' -Wait
```

## Icons

Tauri bundle icons are regenerated from a single 1024×1024 source:

```powershell
npm run tauri -- icon brand\png\icon\dark_background\copilot-hub-icon-dark-bg-1024.png
```

This regenerates `src-tauri/icons/` for Windows, macOS, Linux, iOS, and Android targets.

## Audit before release

```powershell
npm audit --omit=dev
cd src-tauri
cargo check
```

Use `npm audit fix` for non-breaking fixes. Re-run the full test suite after any dependency change.
