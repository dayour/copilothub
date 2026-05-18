---
sidebar_position: 2
title: Provision New User
---

# Provision New User

Provisions a new employee in Entra ID, assigns an M365 license, and verifies the mailbox is created. Demonstrates multi-step MCP invocations chained with a shell verification step and a retry policy.

- **File:** `sample-runbooks/provision-new-user.yaml`
- **Visibility:** `enterprise`
- **Tags:** `enterprise`, `provisioning`, `entra`, `m365`

## Variables

| Name | Source | Description |
| --- | --- | --- |
| `display_name` | prompt | New user display name |
| `email` | prompt | UPN (user@domain) |
| `department` | prompt | Department name |
| `license_sku` | literal (`ENTERPRISEPREMIUM`) | M365 SKU |

## Steps

1. **create-user** — `mcp.invoke` to the `agent365` server, tool `create_user`. `onError: abort`.
2. **assign-license** — `mcp.invoke` to assign the configured SKU. 30s timeout.
3. **verify-mailbox** — `shell.exec` calls `az ad user show` and validates the result. `onError: retry, count: 3`.

## When to use

This workflow is the reference for any process that needs to chain identity actions with verification. The retry policy on the final step accommodates the asynchronous nature of mailbox provisioning.
