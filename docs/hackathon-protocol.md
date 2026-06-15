# CopilotHub Tri State Orchestration Protocol (TSOP)

**Version:** 1.1
**Status:** Active
**Authoritative Design Reference:** <https://fluent2.microsoft.design/>

---

## Table of Contents

1. [Overview](#overview)
2. [Lane Definitions](#lane-definitions)
3. [Feature Set](#feature-set)
4. [Fluent 2 Design Mandate](#fluent-2-design-mandate)
5. [Cross-Channel Feedback Mechanics](#cross-channel-feedback-mechanics)
6. [Time-Boxing](#time-boxing)
7. [Entry and Exit Criteria](#entry-and-exit-criteria)
8. [Merge Strategy](#merge-strategy)
9. [Judging Panel](#judging-panel)
10. [Appendix: Quick Reference](#appendix-quick-reference)

---

## Overview

CopilotHub is a Tauri 2.x + React 19 + Rust agent workbench enabling
a multi-tab browser, AI chat, MCP sidecar bridge, integrated terminal, VS Code tab,
runbook system, Zustand state management, Tailwind CSS 4 styling, and Entra SSO facade.

This protocol delivers an adaptive parallel development workspace in which three
independent lanes implement an identical feature set against CopilotHub. Each lane
operates under different AI model constraints. After implementation, cross-channel
review and scoring determine how deliverables merge into the main branch.

Every UI deliverable produced by any lane MUST conform to Microsoft Fluent 2 design
principles. Non-compliant work is rejected at the exit gate.

---

## Lane Definitions

| Property | Lane O (OpenAI) | Lane A (Anthropic) | Lane D (Dayour / DAYOURBOT) |
|---|---|---|---|
| **Primary Models** | GPT-5.x family | Claude model family | Fleet agents with model selection |
| **Core Strengths** | Code generation, function calling, structured output (JSON mode) | Deep reasoning, nuanced analysis, long-context synthesis | Deep CopilotHub domain context, MCP-native tool orchestration |
| **Branch Prefix** | `lane-o/` | `lane-a/` | `lane-d/` |
| **Recommended For** | Rapid scaffolding, API plumbing, tool-call pipelines | Architecture decisions, complex refactors, design reviews | End-to-end CopilotHub feature work, sidecar integration |

### Lane Operating Rules

1. Each lane works on its own feature branch off `main`.
2. Lanes may not inspect each other's branches during active development.
3. All lanes share the same dev environment, test harness, and Fluent 2 token package.
4. Communication between lanes happens only during formal cross-review windows.

---

## Feature Set

Every lane implements the identical feature list below. Each feature is tagged with a
size (S / M / L) that governs its time-box.

| ID | Feature | Size | Description |
|---|---|---|---|
| F-01 | Multi-provider AI chat backend | L | OpenAI, Anthropic, and custom endpoint support behind a unified provider interface. Zustand store for provider state. Rust sidecar relay for token management. |
| F-02 | Provider switching UI | M | Fluent 2 segmented control or dropdown allowing the user to switch AI providers in-chat. Must persist selection in Zustand and survive tab reload. |
| F-03 | Streaming response rendering | M | Token-by-token rendering from each provider endpoint. Unified stream adapter normalizing SSE and WebSocket transports. Must handle backpressure gracefully. |
| F-04 | Cross-provider comparison view | L | Side-by-side card layout using Fluent 2 elevation and card patterns. Send one prompt to N providers, render responses simultaneously, allow the user to rate and select. |
| F-05 | Enhanced MCP tool routing | L | Provider-specific MCP adapters. Route tool calls through the sidecar bridge with adapter selection based on active provider. Must support tool-call chaining. |
| F-06 | AI-assisted runbook step generation | M | Given a runbook skeleton, generate step-by-step instructions using the active AI provider. Integrate with the existing runbook system. Editable output. |
| F-07 | Entra SSO completion | S | Complete the Entra SSO facade: token acquisition, silent refresh, conditional access handling, and session persistence in the Tauri secure store. |
| F-08 | Azure Key Vault integration | M | Read secrets from Azure Key Vault at runtime. Entra token passthrough. Cache secrets in the Rust sidecar with configurable TTL. Surface errors in the UI. |
| F-09 | Performance optimization | L | Bundle size reduction (tree-shaking, code splitting). Render performance (React profiler, memo boundaries). Sidecar latency (Rust async tuning, connection pooling). |

---

## Fluent 2 Design Mandate

All UI implementations across all three lanes MUST comply with Microsoft Fluent 2.
The authoritative reference is <https://fluent2.microsoft.design/>.

### Color System

Use Fluent 2 color tokens exclusively. Do not hard-code hex values.

| Token Category | Example Tokens | Usage |
|---|---|---|
| Neutral backgrounds | `colorNeutralBackground1`, `colorNeutralBackground2`, `colorNeutralBackground3` | Page surfaces, cards, sidebars |
| Brand | `colorBrandBackground`, `colorBrandForeground1`, `colorBrandStroke1` | Primary actions, active states, accent elements |
| Status | `colorStatusDangerBackground1`, `colorStatusSuccessBackground1`, `colorStatusWarningBackground1` | Alerts, validation, system health |
| Subtle | `colorSubtleBackground`, `colorSubtleBackgroundHover`, `colorSubtleBackgroundPressed` | Hover states, secondary surfaces |

Theme switching (light/dark) must work via token swapping, not conditional CSS.

### Spacing Grid

All spacing follows the 4px base grid.

| Token | Value | Common Use |
|---|---|---|
| `spacingHorizontalXXS` | 2px | Inline icon gaps |
| `spacingHorizontalXS` | 4px | Tight element padding |
| `spacingHorizontalS` | 8px | Standard inner padding |
| `spacingHorizontalM` | 12px | Card padding, form gaps |
| `spacingHorizontalL` | 16px | Section margins |
| `spacingHorizontalXL` | 20px | Page-level gutters |
| `spacingHorizontalXXL` | 24px | Large section separation |

No arbitrary pixel values. Every margin, padding, and gap must map to a spacing token.

### Typography

Font stack: `"Segoe UI Variable", "Segoe UI", system-ui, sans-serif`

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `caption1` | 12px | 400 | 16px | Metadata, timestamps |
| `body1` | 14px | 400 | 20px | Default body text |
| `body1Strong` | 14px | 600 | 20px | Emphasized body text |
| `subtitle2` | 16px | 600 | 22px | Card titles, section headers |
| `subtitle1` | 20px | 600 | 26px | Panel titles |
| `title3` | 24px | 600 | 32px | Page section titles |
| `title2` | 28px | 600 | 36px | Major headings |
| `title1` | 32px | 600 | 40px | Top-level page titles |

### Elevation System

| Token | Offset | Blur | Usage |
|---|---|---|---|
| `shadow2` | 0 1px | 2px | Subtle lift (cards at rest) |
| `shadow4` | 0 2px | 4px | Hovered cards, dropdowns |
| `shadow8` | 0 4px | 8px | Popovers, tooltips |
| `shadow16` | 0 8px | 16px | Dialog overlays |
| `shadow28` | 0 14px | 28px | Modal surfaces |
| `shadow64` | 0 32px | 64px | Top-level overlays, teaching callouts |

Cards in the comparison view (F-04) must use `shadow2` at rest and `shadow4` on hover.

### Motion

| Token | Value | Usage |
|---|---|---|
| `durationUltraFast` | 50ms | Micro-interactions (checkbox, toggle) |
| `durationFaster` | 100ms | Hover transitions |
| `durationFast` | 150ms | Small element animations |
| `durationNormal` | 200ms | Standard transitions |
| `durationSlow` | 300ms | Panel slide, expand/collapse |
| `durationSlower` | 400ms | Page transitions |
| `curveEasyEase` | cubic-bezier(0.33, 0, 0.67, 1) | General-purpose easing |
| `curveDecelerateMax` | cubic-bezier(0, 0, 0, 1) | Elements entering the viewport |
| `curveAccelerateMax` | cubic-bezier(1, 0, 1, 1) | Elements leaving the viewport |
| `curveDecelerateMid` | cubic-bezier(0, 0, 0, 0.7) | Subtle deceleration |

All animated transitions must use these tokens. No `ease-in-out` or `linear` raw values.

### Layout and Density

- **Responsive breakpoints:** Compact (<640px), Medium (640-1024px), Wide (>1024px)
- **Content density modes:** Compact (28px row height), Normal (36px row height), Spacious (44px row height)
- **Corner radii:** Small = 4px, Medium = 8px (used for cards and inputs), Large = 12px, Circular = 50%
- **Input style:** Pill-shaped where appropriate, with rounded corners at 4px or 8px radii
- **Backgrounds:** Subtle, layered backgrounds -- avoid stark white or pure black surfaces

### Compliance Checkpoint

```
Fluent 2 Compliance Checklist (per feature)
--------------------------------------------
[ ] All colors reference Fluent 2 tokens (no raw hex/rgb)
[ ] Spacing uses 4px grid tokens exclusively
[ ] Typography uses Fluent 2 type ramp tokens
[ ] Elevation uses shadow tokens (shadow2 through shadow64)
[ ] All transitions use motion tokens (duration + easing)
[ ] Layout respects responsive breakpoints
[ ] Density mode support (at minimum: normal)
[ ] Corner radii use 4px / 8px / 12px system
[ ] Components feel native to the Fluent 2 ecosystem
[ ] Light and dark theme both function via token swap
```

---

## Cross-Channel Feedback Mechanics

### Process

After a lane completes a feature, the other two lanes review the deliverable.

```
Lane O completes F-01  -->  Lane A reviews  +  Lane D reviews
Lane A completes F-01  -->  Lane O reviews  +  Lane D reviews
Lane D completes F-01  -->  Lane O reviews  +  Lane A reviews
```

### Review Template

Each review produces a structured assessment:

```
Feature:        [ID and name]
Reviewing Lane: [O / A / D]
Target Lane:    [O / A / D]

STRENGTHS
- [List concrete technical and design strengths]

WEAKNESSES
- [List concrete technical and design weaknesses]

SUGGESTIONS
- [Actionable improvement recommendations]

FLUENT 2 COMPLIANCE SCORE:  [1-10]
  Justification: [Brief rationale referencing specific tokens or patterns]

OVERALL SCORE:              [1-10]
  Justification: [Brief rationale covering correctness, completeness, code quality]
```

### Scoring Rubric

| Score | Fluent 2 Compliance Meaning | Overall Meaning |
|---|---|---|
| 1-3 | Major violations: raw colors, no tokens, broken layout | Non-functional or fundamentally flawed |
| 4-5 | Partial compliance: some tokens used, gaps in spacing or motion | Functional but incomplete or fragile |
| 6-7 | Mostly compliant: minor token gaps, density mode missing | Solid implementation, minor issues |
| 8-9 | Fully compliant: all tokens, all density modes, proper motion | Production-quality, well-tested |
| 10 | Exemplary: exceeds requirements, innovative use of Fluent 2 | Exceptional, sets a new standard |

### Feedback Incorporation

After receiving reviews, the original lane has a **30-minute time-box** to incorporate
feedback. Changes during this window must be scoped to the review findings -- no new
feature work.

---

## Time-Boxing

| Feature Size | Development Time-Box | Cross-Review Window | Feedback Incorporation |
|---|---|---|---|
| **S** (Small) | 2 hours | 1 hour (30 min per reviewer) | 30 minutes |
| **M** (Medium) | 4 hours | 1 hour (30 min per reviewer) | 30 minutes |
| **L** (Large) | 8 hours | 1 hour (30 min per reviewer) | 30 minutes |

### Schedule Template (per feature)

```
[T+0h]          Development begins
[T+Nh]          Development time-box expires (N = 2, 4, or 8)
[T+Nh]          Code freeze; push to lane branch
[T+Nh to T+N+1] Cross-review by two other lanes
[T+N+1 to T+N+1.5] Feedback incorporation (30 min)
[T+N+1.5]       Final commit; feature locked
```

### Hard Rules

- If development exceeds the time-box, the lane submits what exists. No extensions.
- Cross-review must produce written scores. A missing review defaults to score 5.
- Feedback incorporation is optional. The lane may decline changes with justification.

---

## Entry and Exit Criteria

### Entry Criteria (must ALL be true before the hackathon starts)

| Criterion | Verification |
|---|---|
| Model access confirmed for all three lanes | Each lane can make a successful API call to its primary model |
| Dev environment running | `pnpm dev` launches the Tauri app without errors |
| Test suite passing | `pnpm test` exits with zero failures |
| TypeScript clean | `tsc --noEmit` reports zero errors |
| Fluent 2 design tokens available | `@fluentui/tokens` or equivalent package is installed and importable |
| Branch structure created | `lane-o/main`, `lane-a/main`, `lane-d/main` branches exist off current `main` |
| Shared API contracts documented | Provider interface types checked into `src/types/providers.ts` |

### Exit Criteria (per feature, per lane)

| Gate | Command / Check | Pass Condition |
|---|---|---|
| TypeScript | `tsc --noEmit` | Zero errors, zero warnings |
| Unit tests | `vitest run` | All tests pass, no skipped tests related to this feature |
| No regressions | `vitest run --reporter=verbose` | No previously-passing tests now fail |
| Lint | `eslint . --max-warnings 0` | Zero warnings, zero errors |
| Fluent 2 compliance | Manual checklist (see above) | All 10 items checked |
| Cross-review scores | Average of two reviewer scores | Overall score >= 6 AND Fluent 2 score >= 6 |
| Bundle impact | `pnpm build && ls -la dist/` | No more than 5% increase in bundle size vs. baseline |

A feature that fails any exit gate is not eligible for merge.

---

## Merge Strategy

After all features are scored, the judging panel selects a merge strategy per feature.

### Strategy 1: Best-of-Breed

Pick the single best implementation for each feature based on scores.

```
F-01: Lane A scored highest    --> merge lane-a/F-01 into main
F-02: Lane O scored highest    --> merge lane-o/F-02 into main
F-03: Lane D scored highest    --> merge lane-d/F-03 into main
...
```

**When to use:** Features are self-contained; implementations diverge significantly.

### Strategy 2: Hybrid

Combine elements from multiple lanes into a single merged implementation.

```
F-04: Lane O's streaming logic + Lane A's card layout + Lane D's MCP routing
      --> Cherry-pick and integrate, resolve conflicts manually
```

**When to use:** Each lane excels at different aspects of the same feature.

### Strategy 3: Winner-Take-All

One lane dominates across most features; adopt that lane's branch wholesale.

```
Lane D scores highest on 7/9 features
      --> Rebase lane-d/main onto main; cherry-pick individual wins from O and A
```

**When to use:** One lane is clearly superior overall; minimizes integration risk.

### Merge Decision Matrix

| Condition | Recommended Strategy |
|---|---|
| One lane leads by >= 2 points average across all features | Winner-Take-All |
| Scores are within 1 point across lanes for a given feature | Hybrid |
| One lane dominates a specific feature by >= 3 points | Best-of-Breed for that feature |
| All lanes score below 6 on a feature | Re-implement collaboratively (no merge) |

---

## Judging Panel

Four specialist agents form the judging panel. Each evaluates from their domain.

| Judge | Agent ID | Domain | Weight |
|---|---|---|---|
| Architecture | `dayour-architect` | System design, API contracts, scalability, separation of concerns | 25% |
| Code Quality | `dayour-swe` | Implementation correctness, test coverage, error handling, performance | 30% |
| Design and UX | `dayour-design` | Fluent 2 compliance, visual consistency, accessibility, interaction quality | 25% |
| Automated Gates | `dayour-evaluation` | TypeScript compilation, test results, lint, bundle size, CI pipeline status | 20% |

### Scoring Process

1. `dayour-evaluation` runs automated gate checks first. Features failing gates are disqualified.
2. `dayour-architect`, `dayour-swe`, and `dayour-design` independently score passing features.
3. Weighted scores are computed per feature per lane.
4. The panel convenes to select the merge strategy for each feature.

### Final Score Formula

```
FinalScore(lane, feature) =
    0.25 * architect_score
  + 0.30 * swe_score
  + 0.25 * design_score
  + 0.20 * evaluation_score
```

The `evaluation_score` is binary-weighted: 10 if all gates pass, 0 if any gate fails.

---

## Appendix: Quick Reference

### Branch Naming

```
lane-o/<feature-id>     e.g., lane-o/F-01-multi-provider-chat
lane-a/<feature-id>     e.g., lane-a/F-01-multi-provider-chat
lane-d/<feature-id>     e.g., lane-d/F-01-multi-provider-chat
```

### Commit Message Format

```
[Lane-O|A|D] F-XX: <short description>

<body>

Co-authored-by: <lane agent>
```

### Feature-to-Size Mapping (Summary)

| Feature | Size | Dev Hours | Total Hours (incl. review) |
|---|---|---|---|
| F-01 Multi-provider AI chat backend | L | 8 | 9.5 |
| F-02 Provider switching UI | M | 4 | 5.5 |
| F-03 Streaming response rendering | M | 4 | 5.5 |
| F-04 Cross-provider comparison view | L | 8 | 9.5 |
| F-05 Enhanced MCP tool routing | L | 8 | 9.5 |
| F-06 AI-assisted runbook step generation | M | 4 | 5.5 |
| F-07 Entra SSO completion | S | 2 | 3.5 |
| F-08 Azure Key Vault integration | M | 4 | 5.5 |
| F-09 Performance optimization | L | 8 | 9.5 |

**Total per lane:** 50 development hours + 13.5 review hours = 63.5 hours

### Technology Stack Reference

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2.x (Rust backend, WebView2 frontend) |
| Frontend framework | React 19 |
| State management | Zustand |
| Styling | Tailwind CSS 4, Fluent 2 design tokens |
| Type system | TypeScript (strict mode) |
| Test framework | Vitest |
| Auth | Microsoft Entra ID (SSO facade) |
| Secrets | Azure Key Vault |
| AI transport | MCP sidecar bridge (Rust) |

---

*This document governs all 3-lane hackathon activity on CopilotHub. Deviations require
written approval from the judging panel.*
