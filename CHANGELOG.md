# Changelog

All notable changes to CopilotHub are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions, and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `requiresEntraAuth` flag on Graph tool definitions to make Entra SSO dependency explicit at the catalog level (defect D7 tracking).
- Integration smoke tests for PAC CLI (`pacClient`), `@mentions` dispatch routing (graph, power, dataverse, workiq/agent365 targets), and `ToolRegistry.requiresEntraAuth` filtering.

---

## [2.1.0] — 2026-05-18

### Added
- **Phase 3 Integrations** — WorkIQ ACL fix, Copilot Studio `ErrorBoundary`, PAC CLI + Dataverse tools, `@mentions` dispatch routing, Microsoft Graph tools enabled.
- **Persistent Capture** — Screenshots saved to `Pictures\Screenshots\CopilotHub\`; screen recordings saved to `Videos\CopilotHub\` with full replay support.
- **Docs site** — Docusaurus 3 with brand theme, dark-default, agent & workflow catalogs, deployed to GitHub Pages.
- **CI** — Daily `repo-status` workflow tracking `@main`.

### Changed
- Brand updated to v1.2.0.

### Fixed
- 0 npm vulnerabilities across all dependencies.

### Stats
- 352 tests passing, all CI gates green.

---

## [2.0.0] — 2026-04-28

Initial public release of CopilotHub.
