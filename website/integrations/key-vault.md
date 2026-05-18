---
sidebar_position: 7
title: Azure Key Vault
---

# Azure Key Vault

Secrets used inside the workbench (for example, by runbooks) are referenced by URI and resolved at the point of use. Plain credentials are never persisted in the workbench's own storage.

## URI form

```text
vault://<scope>/<secret-name>
```

Internally this is mapped to the canonical Key Vault REST URL using the configured vault for the scope:

```text
https://<vault-name>.vault.azure.net/secrets/<secret-name>
```

## Usage in a runbook

```yaml
variables:
  - name: password
    type: secret
    source: "vault://personal/utility-password"
    description: Utility account password from Key Vault
```

## Permissions

The signed-in user (see [Entra SSO](./entra-sso)) must hold the `get` permission on the secret. The workbench does not maintain a service principal of its own.
