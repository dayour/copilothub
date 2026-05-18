---
sidebar_position: 1
title: Getting started
---

# Getting started

CopilotHub is a Tauri desktop application. Building it locally requires Node.js, Rust, and the Tauri CLI.

## Prerequisites

| Tool | Minimum version |
| --- | --- |
| Node.js | 22 |
| Rust | 1.93 (stable toolchain) |
| Tauri CLI | 2.x (installed via `@tauri-apps/cli`) |
| Windows build tools | Visual Studio Build Tools 2022 + Windows SDK |

On Windows, WebView2 must be available — it ships with Windows 10/11 by default.

## Clone

```powershell
git clone https://github.com/dayour/copilothub.git
cd copilothub
```

## Install dependencies

```powershell
npm install
```

This installs the React frontend toolchain and the Tauri CLI. Rust dependencies are fetched the first time you build the backend.

## Run in development

```powershell
npm run tauri dev
```

The first launch compiles the Rust core in debug mode and may take several minutes. Subsequent launches are incremental and fast.

## Run the frontend only

If you only need to iterate on the React layer:

```powershell
npm run dev
```

This starts the Vite dev server on `http://localhost:1420` without the Tauri shell.

## Run tests

```powershell
npm test -- --run
```

Vitest runs the full TypeScript test suite. The Rust side has unit tests in `src-tauri/src/process.rs`; run them with:

```powershell
cd src-tauri
cargo test
```

## Next steps

- Read the [architecture overview](./architecture).
- Walk through [build and package](./build-and-package) when you are ready to produce installers.
- See [security](./security) for the Tauri capability model and identity boundaries.
