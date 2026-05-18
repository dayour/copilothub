# CopilotHub Brand Assets Index

Source of truth: `brand/` (flat layout). Everything below maps actual delivered files to their runtime location.

## Brand palette

| Token | Hex | Use |
|---|---|---|
| `--color-brand-night` | `#0B1117` | App canvas / dark surface |
| `--color-brand-night-2` | `#121A24` | Elevated dark surface |
| `--color-brand-ink` | `#0F172A` | Deep text / icon background |
| `--color-brand-slate` | `#7B8DAA` | Secondary text / muted UI |
| `--color-brand-cloud` | `#F7FBFF` | Light surface / inverse text |
| `--color-brand-copilot-blue` | `#7BA4D6` | Gradient start, soft accent |
| `--color-brand-hub-blue` | `#38C8FF` | Gradient end, primary accent glow |
| `--gradient-brand-hub` | `linear-gradient(135deg, #7BA4D6 -> #38C8FF)` | Hero / featured tiles |

Defined in `src/styles/globals.css`.

## Hero

- `brand/hero-banner.png` -- README hero (large gradient + wordmark)
- `brand/preview-copilot-hub-logo-set.png` -- alt preview render

## Public runtime assets (`public/`)

| File | Source |
|---|---|
| `public/favicon.svg` | `brand/svg/favicon.svg` |
| `public/favicon.ico` | `brand/png/favicon/favicon.ico` |
| `public/apple-touch-icon.png` | `brand/png/favicon/copilot-hub-favicon-180x180.png` |
| `public/icon-192.png` | `brand/png/favicon/copilot-hub-favicon-192x192.png` |
| `public/icon-512.png` | `brand/png/favicon/copilot-hub-favicon-512x512.png` |
| `public/og-image.png` | `brand/png/social/copilot-hub-open-graph-1200x630.png` |
| `public/copilot-hub-mark.svg` | `brand/svg/icon/copilot-hub-icon-gradient.svg` |
| `public/copilot-hub-mark-glow.svg` | `brand/svg/icon/copilot-hub-icon-gradient-glow.svg` |
| `public/copilot-hub-lockup-dark.svg` | `brand/svg/lockups/copilot-hub-horizontal-dark.svg` |
| `public/copilot-hub-lockup-light.svg` | `brand/svg/lockups/copilot-hub-horizontal-light.svg` |
| `public/copilot-hub-wordmark.svg` | `brand/svg/wordmark/copilot-hub-wordmark-white.svg` |

Referenced from `index.html` (favicons + OG) and from React components via `/copilot-hub-*` URLs.

## Bundled in JS (`src/assets/`)

Used when a component needs to bundle/inline the asset (currently mirrored copies of the `public/` set for future Vite imports):

- `copilot-hub-mark.svg`, `copilot-hub-mark-glow.svg`, `copilot-hub-mark-white.svg`
- `copilot-hub-lockup-dark.svg`, `copilot-hub-lockup-light.svg`
- `copilot-hub-wordmark.svg`

## Tauri bundle icons (`src-tauri/icons/`)

Regenerated from `brand/png/icon/dark_background/copilot-hub-icon-dark-bg-1024.png` via:

```powershell
npm run tauri -- icon brand\png\icon\dark_background\copilot-hub-icon-dark-bg-1024.png
```

This produces all Windows / macOS / Linux / iOS / Android bundle icon variants.

## Module icon library

`brand/svg/` contains complete module icon sets for: agents, analytics, automations, chat, create, explore, hub, integrations, knowledge, notifications, security, settings, tools, users.

Variants per module:

- `svg/gradient/` -- gradient fill (hero/featured surfaces)
- `svg/mono-white/` -- mono white (dark UI chrome)
- `svg/mono-black/` -- mono black (light UI chrome)
- `svg/current-color/` -- `currentColor` (inline themable)
- `svg/copilot-hub-icon-sprite.svg` -- symbol sprite for `<use>` references

## Colorways

`brand/colorways/` includes 6 colorway studies (graphite-blue, nitrous-blue-gray, reverse-nitrous-gray, steel-to-nitrous, ui-slate-cyan, original) in both dark-bg + transparent across svg + png. Not shipped to runtime; for design reference.

## In-app integration points

| Component | Asset |
|---|---|
| `src/components/TitleBar.tsx` | `/copilot-hub-mark.svg` (h-4 next to wordmark) |
| `src/components/NewTabPage.tsx` hero | `/copilot-hub-mark-glow.svg` (h-14) |
| `index.html` favicons + OG | `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `/og-image.png` |
| `README.md` hero banner | `brand/hero-banner.png` |

## Regeneration commands

```powershell
# Rebundle Tauri icons after master changes
npm run tauri -- icon brand\png\icon\dark_background\copilot-hub-icon-dark-bg-1024.png

# Resync public + src/assets from brand (run from repo root)
Copy-Item brand\svg\favicon.svg public\favicon.svg -Force
Copy-Item brand\png\favicon\favicon.ico public\favicon.ico -Force
Copy-Item brand\png\favicon\copilot-hub-favicon-180x180.png public\apple-touch-icon.png -Force
Copy-Item brand\png\favicon\copilot-hub-favicon-192x192.png public\icon-192.png -Force
Copy-Item brand\png\favicon\copilot-hub-favicon-512x512.png public\icon-512.png -Force
Copy-Item brand\png\social\copilot-hub-open-graph-1200x630.png public\og-image.png -Force
Copy-Item brand\svg\icon\copilot-hub-icon-gradient.svg public\copilot-hub-mark.svg -Force
Copy-Item brand\svg\icon\copilot-hub-icon-gradient-glow.svg public\copilot-hub-mark-glow.svg -Force
```
