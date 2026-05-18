---
sidebar_position: 3
title: '@terminal'
---

# @terminal

Routes to the local shell via the Tauri shell plugin. Commands run with the user's permissions; capability scoping in `src-tauri/capabilities/` limits which executables can be invoked.

## Commands

| Form | Tool | Arguments |
| --- | --- | --- |
| `@terminal run <cmd>` | `shell_exec` | `command` |
| `@terminal <cmd>` | `shell_exec` | `command` (bare form) |

## Examples

```text
@terminal run npm test -- --run
@terminal ls -la
@terminal git status
```

## Output

The full stdout and stderr are returned. Long output is truncated in the chat surface but available in the terminal tab if you re-run the command there.
