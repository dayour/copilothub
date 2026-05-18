---
sidebar_position: 4
title: Runbook schema
---

# Runbook schema

A runbook is a YAML document that declares a sequence of steps the workbench executes. Runbooks are parsed and validated, then executed step-by-step by the runbook executor in `src/lib/runbookExecutor.ts`.

## Top-level fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Human-readable name |
| `version` | string | yes | Semantic version of the runbook |
| `author` | string | no | Author or owning team |
| `description` | string | no | Short summary |
| `tags` | string[] | no | Free-form tags for filtering in the marketplace |
| `visibility` | enum | no | `personal`, `team`, or `enterprise` |
| `variables` | Variable[] | no | Inputs collected before execution |
| `steps` | Step[] | yes | Ordered list of steps |

## Variables

```yaml
variables:
  - name: email
    type: string
    source: prompt        # or "literal"
    description: New user email address
  - name: license_sku
    type: string
    source: literal
    defaultValue: "ENTERPRISEPREMIUM"
```

`source: prompt` collects the value from the user at run time. `source: literal` uses `defaultValue` directly.

## Steps

```yaml
steps:
  - id: create-user
    tool: mcp.invoke
    args:
      server: agent365
      tool: create_user
      arguments:
        displayName: "${display_name}"
        userPrincipalName: "${email}"
    description: Create user in Entra ID
    timeout: 30000
    onError:
      action: abort        # abort | continue | retry
      count: 3             # required when action is retry
    validate:
      selector: "output"
      expected: "true"
```

| Field | Description |
| --- | --- |
| `id` | Unique step identifier |
| `tool` | Tool route: `mcp.invoke`, `shell.exec`, `browser.*`, `runbook.*` |
| `args` | Tool-specific arguments; `${variable}` interpolation is supported |
| `timeout` | Step timeout in milliseconds |
| `onError` | `abort`, `continue`, or `retry` with a `count` |
| `validate` | Optional post-condition check |

## Example: provision a new user

```yaml
name: Provision New User
version: "1.0.0"
description: Provision a new employee in Azure AD, assign licenses, and create mailbox
tags: [enterprise, provisioning, entra, m365]
visibility: enterprise
variables:
  - {name: display_name, type: string, source: prompt}
  - {name: email, type: string, source: prompt}
  - {name: department, type: string, source: prompt}
  - {name: license_sku, type: string, source: literal, defaultValue: "ENTERPRISEPREMIUM"}
steps:
  - id: create-user
    tool: mcp.invoke
    args: {server: agent365, tool: create_user, arguments: {displayName: "${display_name}", userPrincipalName: "${email}", department: "${department}"}}
    onError: {action: abort}
  - id: assign-license
    tool: mcp.invoke
    args: {server: agent365, tool: assign_license, arguments: {userPrincipalName: "${email}", skuId: "${license_sku}"}}
    timeout: 30000
  - id: verify-mailbox
    tool: shell.exec
    args: {command: "az ad user show --id ${email} --query mailNickname"}
    onError: {action: retry, count: 3}
```

See [workflows](/workflows/overview) for the full catalog of sample runbooks shipped in the repository.
