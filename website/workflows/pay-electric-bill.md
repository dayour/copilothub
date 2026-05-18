---
sidebar_position: 4
title: Pay Electric Bill
---

# Pay Electric Bill

Automates a recurring utility payment by driving the utility company's login and checkout flow.

- **File:** `sample-runbooks/pay-electric-bill.yaml`
- **Visibility:** `personal`
- **Tags:** `automation`, `billing`

## Variables

| Name | Source | Description |
| --- | --- | --- |
| `utility_url` | literal | Login page URL |
| `username` | prompt | Account username |
| `password` | `vault://personal/utility-password` | Resolved from Key Vault at run time |

## What it shows

- A `type: secret` variable resolved via the [Key Vault integration](/integrations/key-vault).
- Browser interactions (`browser.navigate`, fill, click) against a stateful site.

## When to use

The vault-resolved secret pattern in this workflow is the reference for any runbook that must operate on credentials without persisting them in the YAML file. Never inline a real password — always reference it via `vault://`.
