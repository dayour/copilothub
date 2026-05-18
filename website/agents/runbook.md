---
sidebar_position: 5
title: '@runbook'
---

# @runbook

Executes a named runbook from the marketplace.

## Commands

| Form | Tool | Arguments |
| --- | --- | --- |
| `@runbook run <name>` | `runbook_execute` | `name` |

## Example

```text
@runbook run provision-new-user
```

The runbook is parsed, variables marked `source: prompt` are collected interactively, and each step runs in order. Progress is rendered in the chat surface; full output is available in the runbook tab.

## See also

- [Runbook schema](/docs/runbook-schema) — the YAML contract
- [Workflows](/workflows/overview) — bundled sample runbooks
