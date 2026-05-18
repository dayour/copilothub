---
sidebar_position: 6
title: Entra SSO
---

# Entra SSO

CopilotHub does not implement an OAuth flow inside the application. Sign-in is delegated to the operating system's account broker, which talks to Microsoft Entra ID.

## What it does

- Surfaces the current user identity to the workbench.
- Provides the bearer token used by MCP servers that authenticate against Entra (for example, the `agent365` server in the sample workflows).

## What it does not do

- Persist refresh tokens to disk. Tokens live in the broker, not in workbench storage.
- Implement client credentials, device code, or interactive flows in-process.

## Failure modes

If no signed-in account is available, MCP calls that require an Entra token will fail with `auth_required`. Open the system identity surface to sign in, then re-run the call.
