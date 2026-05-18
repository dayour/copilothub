---
sidebar_position: 2
title: MCP
---

# MCP (Model Context Protocol)

CopilotHub uses MCP to call tools from both the chat tab (in action mode) and from runbook steps.

## Registry

`src/lib/mcpRegistry.ts` is the source of truth for configured MCP servers. Each entry declares:

- `name` — display name
- `transport` — `http`, `sse`, or `stdio`
- `endpoint` — URL or command
- `tools` — list of advertised tools and their JSON-schema arguments

## Invocation from a runbook

```yaml
- id: create-user
  tool: mcp.invoke
  args:
    server: agent365
    tool: create_user
    arguments:
      displayName: "${display_name}"
      userPrincipalName: "${email}"
```

## Invocation from chat

```text
@browser navigate to https://example.com
```

`@browser` is shorthand routed to the CopilotBrowser sidecar (which is itself an MCP server). Other `@mention` agents have their own routes — see [Agents](/agents/overview).

## Adding a server

1. Append an entry to the MCP registry.
2. Restart the workbench so the registry is reloaded.
3. The new server's tools become available to runbooks and to action-mode chat (under a configurable `@mention` prefix).
