---
sidebar_position: 5
title: Terminal
---

# Terminal

The terminal tab uses xterm.js wired to PowerShell via the Tauri shell plugin. Command execution from `@terminal` goes through `src-tauri/src/terminal.rs`.

## Capability scope

The shell capability is declared in `src-tauri/capabilities/`. Only the configured shell binary is reachable; arbitrary executables outside that scope are denied.

## Streaming

Output is streamed to the chat tab when invoked via `@terminal`, and rendered live in the terminal tab when invoked directly there.

## Custom shells

The default shell is PowerShell on Windows. To target a different shell, update the capability allow-list and the terminal launch arguments.
