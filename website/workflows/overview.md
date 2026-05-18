---
sidebar_position: 1
title: Overview
---

# Workflows

Workflows are YAML runbooks executed by `src/lib/runbookExecutor.ts`. The repository ships three reference workflows under `sample-runbooks/` that exercise the main capabilities of the schema: prompts, vault secrets, MCP invocations, shell calls, and per-step error policies.

## Sample workflows

| Workflow | Visibility | Tags | Demonstrates |
| --- | --- | --- | --- |
| [Provision New User](./provision-new-user) | `enterprise` | `entra`, `m365`, `provisioning` | Multi-step MCP calls + shell verification + retry policy |
| [Headless Data Scrape Report](./data-scrape-report) | `personal` | `automation`, `scraping`, `reporting` | Browser navigation + extraction across multiple targets |
| [Pay Electric Bill](./pay-electric-bill) | `personal` | `automation`, `billing` | Vault-resolved secret + browser interaction |

See the [runbook schema](/docs/runbook-schema) for the full field reference.
