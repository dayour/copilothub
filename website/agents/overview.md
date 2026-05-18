---
sidebar_position: 1
title: Overview
---

# Agents

Agents in CopilotHub are tool families addressed by `@mention` from the chat tab in **action mode**. Each agent maps to one or more tool calls. Action parsing is implemented in `src/lib/actionMode.ts` and exercised by `actionMode.test.ts`.

## Catalog

| Agent | Routes to | Scope |
| --- | --- | --- |
| [`@browser`](./browser) | CopilotBrowser sidecar | Web automation: navigate, click, fill, screenshot, snapshot |
| [`@terminal`](./terminal) | Shell plugin | Local command execution |
| [`@vscode`](./vscode) | VS Code tab | Open file paths in the embedded editor |
| [`@runbook`](./runbook) | Runbook executor | Run a named runbook from the marketplace |

See also: [Recording](./recording) for screenshot and follow-me capture, including the on-disk layout for Pictures and Videos.

## Invocation

In the chat tab, switch the input to **Action** mode and type a command. The parser accepts both space- and colon-separated forms:

```text
@browser navigate to https://example.com
@browser: navigate to https://example.com
```

Bare commands are supported for `@terminal`:

```text
@terminal ls -la
```

## Result handling

The tool result is appended to the conversation as a typed message. Browser screenshots and snapshots are rendered inline. Errors are surfaced with the tool name and the exit code or exception text.
