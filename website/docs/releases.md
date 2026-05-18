---
sidebar_position: 6
title: Releases
---

# Releases

CopilotHub follows semantic versioning. The version string is bumped in lockstep across `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `src/lib/config.ts`.

## Current

| Version | Date | Highlights |
| --- | --- | --- |
| **2.1.0** | 2026-05-18 | Brand asset integration, comprehensive `.gitignore`, dependency audit fix (0 vulns), worktree purge, documentation site |
| 1.2.0 | 2026-05-17 | Brand mark, gradient hero, lockups, favicons, OG image, palette tokens |
| 1.1.0 | 2026-05-15 | Initial brand polish |
| 1.0.0 | 2026-04 | First public artifact |

The canonical list lives at [github.com/dayour/copilothub/releases](https://github.com/dayour/copilothub/releases).

## Release checklist

1. Bump the version in all four files.
2. Run the full test matrix:
   ```powershell
   npm test -- --run
   npx tsc --noEmit
   cd src-tauri ; cargo check ; cd ..
   ```
3. Run `npm audit --omit=dev` and apply non-breaking fixes.
4. Clean build:
   ```powershell
   Remove-Item -Recurse -Force dist, src-tauri\target\release\bundle -ErrorAction SilentlyContinue
   npm run tauri -- build
   ```
5. Smoke-install the NSIS bundle; verify `FileVersion` matches.
6. Tag the commit and create a GitHub Release with the NSIS and MSI artifacts attached.
