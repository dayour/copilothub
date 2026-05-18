---
sidebar_position: 4
title: '@vscode'
---

# @vscode

Drives the VS Code web tab.

## Commands

| Form | Tool | Arguments |
| --- | --- | --- |
| `@vscode open <path>` | `vscode_open` | `path` |

## Example

```text
@vscode open src/lib/runbookExecutor.ts
```

The path is opened in the embedded `vscode.dev` instance hosted in the VS Code tab. The tab is created on demand if it is not already open.

## Limitations

`@vscode` does not currently support saving or running the embedded editor's commands directly. For shell operations on the file, use `@terminal`.
