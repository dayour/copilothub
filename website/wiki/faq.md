---
sidebar_position: 3
title: FAQ
---

# FAQ

### Is CopilotHub a service?

No. It is a desktop application that runs entirely on the user's machine. There is no cloud back end maintained by the project.

### Which operating systems are supported?

Windows is the supported target today. The Tauri 2 frontend and the Rust core compile on macOS and Linux, but only Windows is exercised by the build, install, and launch pipeline.

### Does it require an internet connection?

The shell and most local tools run offline. Browser navigation, MCP servers that call external APIs, and identity providers (Entra) require network access.

### Where are my data and settings stored?

Local app data lives under `%LOCALAPPDATA%\copilothub\`. The installer registers the same path for upgrades. The application does not transmit telemetry by default.

### How do I file a bug?

Open an [Issue](https://github.com/dayour/copilothub/issues). For questions, discussion threads, or proposals, use the [Forum](https://github.com/dayour/copilothub/discussions).

### Is there a hosted version?

No. The project is delivered exclusively as a desktop installer.

### Can I write my own agents?

Yes — by configuring an MCP server in the registry. See [Agents](/agents/overview) and [Integrations: MCP](/integrations/mcp).

### What is the difference between an agent and a runbook?

An agent is invoked from a single chat message (`@browser snapshot`). A runbook is a multi-step YAML workflow executed by the runbook executor. Agents can be called from inside runbook steps.
