# CopilotHub 3-Lane Hackathon -- Synthesis Scoring Rubric

**Version:** 1.0
**Last Updated:** 2025-07-24
**Applies To:** CopilotHub (Tauri 2.x + React 19 + Rust desktop application)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack Reference](#tech-stack-reference)
3. [Scoring Dimensions](#scoring-dimensions)
   - [A. Code Quality (20%)](#a-code-quality-20)
   - [B. Fluent 2 Design Compliance (20%)](#b-fluent-2-design-compliance-20)
   - [C. UX Coherence (15%)](#c-ux-coherence-15)
   - [D. Architecture Fit (20%)](#d-architecture-fit-20)
   - [E. Performance (10%)](#e-performance-10)
   - [F. Innovation (10%)](#f-innovation-10)
   - [G. Completeness (5%)](#g-completeness-5)
4. [Automated Quality Gates](#automated-quality-gates)
5. [Merge Decision Matrix](#merge-decision-matrix)
6. [Score Sheet Template](#score-sheet-template)
7. [Judging Process](#judging-process)

---

## Overview

This rubric governs the evaluation and merge strategy for all three hackathon lanes
contributing to CopilotHub. Each lane submission is scored across seven weighted
dimensions. The weighted composite score determines the merge path.

**Composite Score Formula:**

```
Composite = (A x 0.20) + (B x 0.20) + (C x 0.15) + (D x 0.20) + (E x 0.10) + (F x 0.10) + (G x 0.05)
```

All dimension scores use a 1--10 integer scale. The composite score therefore ranges
from 1.00 to 10.00.

---

## Tech Stack Reference

| Layer        | Technology                                   |
|--------------|----------------------------------------------|
| Shell        | Tauri 2.x (Rust backend, webview frontend)   |
| Frontend     | React 19, TypeScript 5.8, Vite 7             |
| Styling      | Tailwind CSS 4, Microsoft Fluent 2 tokens    |
| State        | Zustand 5 + immer middleware                 |
| Terminal     | xterm.js                                     |
| Protocol     | MCP over HTTP/SSE                            |
| Tests        | Vitest + @testing-library/react              |
| Build        | tsc --noEmit + vite build                    |

**Fluent 2 Design System Reference:** https://fluent2.microsoft.design/

---

## Scoring Dimensions

### A. Code Quality (20%)

Evaluates TypeScript discipline, error handling, and code organization.

| Score | Criteria |
|-------|----------|
| 1--2  | Pervasive use of `any`. No error handling. Functions exceed 100 lines. No type exports. Inconsistent naming conventions. |
| 3--4  | Some `any` usage remains. Basic try/catch but no retry logic. Moderate function length. Types exist but are incomplete or loosely defined. |
| 5--6  | Minimal `any` (fewer than 5 occurrences). Generic types used for shared utilities. Error boundaries present. Retry logic exists for network calls. Files organized by feature. |
| 7--8  | Zero `any`. Proper generic constraints on all shared types. Discriminated unions for state modeling. Exponential backoff retry with configurable attempts. Barrel exports. Consistent use of `satisfies` and `as const`. |
| 9     | All of 7--8, plus: exhaustive pattern matching, branded types for domain IDs, strict function return types, custom error classes with structured metadata, and all async operations cancellable via AbortController. |
| 10    | All of 9, plus: code reads as documentation. Type-level tests or compile-time assertions. Zero lint warnings. Every module has a single clear responsibility. Error recovery is graceful and user-visible. |

**Automatic deductions:**

- Each instance of `any` that is not explicitly justified with a comment: -0.5
- Missing error handling on any Tauri IPC call or fetch: -1.0
- No retry logic on MCP SSE connections: -0.5

---

### B. Fluent 2 Design Compliance (20%)

This is a dedicated, first-class scoring dimension. CopilotHub must look and feel like
a native Microsoft application. All visual decisions must reference the Fluent 2 design
system at https://fluent2.microsoft.design/.

#### B.1 Color System

| Requirement | Fluent 2 Tokens |
|-------------|-----------------|
| Backgrounds | `colorNeutralBackground1` through `colorNeutralBackground6` |
| Brand accent | `colorBrandBackground`, `colorBrandForeground1`, `colorBrandStroke1` |
| Status | `colorStatusDangerBackground1`, `colorStatusWarningBackground1`, `colorStatusSuccessBackground1` |
| Foreground | `colorNeutralForeground1` through `colorNeutralForeground4`, `colorNeutralForegroundDisabled` |
| Stroke | `colorNeutralStroke1`, `colorNeutralStroke2`, `colorNeutralStrokeAccessible` |

Any hardcoded hex color value (e.g., `#0078d4`, `rgb(255,0,0)`) that is not mapped
through a Fluent 2 token variable is a compliance violation.

#### B.2 Typography

| Requirement | Specification |
|-------------|---------------|
| Font family | Segoe UI Variable (with system fallbacks) |
| Type ramp   | `caption2` (10px), `caption1` (12px), `body1` (14px), `body2` (16px), `subtitle2` (16px/semibold), `subtitle1` (20px), `title3` (24px), `title2` (28px), `title1` (32px) |
| Line height | Must follow Fluent 2 type ramp line-height pairings |
| Weight      | Regular (400), Semibold (600), Bold (700) only |

#### B.3 Spacing and Grid

| Token | Value |
|-------|-------|
| `spacingHorizontalXXS` | 2px |
| `spacingHorizontalXS`  | 4px |
| `spacingHorizontalSNudge` | 6px |
| `spacingHorizontalS`   | 8px |
| `spacingHorizontalMNudge` | 10px |
| `spacingHorizontalM`   | 12px |
| `spacingHorizontalL`   | 16px |
| `spacingHorizontalXL`  | 20px |
| `spacingHorizontalXXL` | 24px |
| `spacingHorizontalXXXL` | 32px |

All layout spacing must align to the **4px base grid**. Arbitrary pixel values that
do not land on the grid are violations.

#### B.4 Elevation and Layering

| Token | Box Shadow | Use Case |
|-------|------------|----------|
| `shadow2`  | Subtle | Resting cards, list items |
| `shadow4`  | Light  | Hover states |
| `shadow8`  | Medium | Floating menus, dropdowns |
| `shadow16` | Strong | Popovers, tooltips |
| `shadow28` | Heavy  | Dialogs, modals |
| `shadow64` | Maximum | Full-screen overlays |

Layering must follow Fluent 2 z-index conventions: content < card < floating < overlay < modal.

#### B.5 Motion

| Token | Duration | Use Case |
|-------|----------|----------|
| `durationUltraFast` | 50ms  | Micro-interactions (checkbox, toggle) |
| `durationFaster`    | 100ms | Hover transitions, focus rings |
| `durationFast`      | 150ms | Small element transitions |
| `durationNormal`    | 200ms | Standard transitions |
| `durationGentle`    | 250ms | Panel slides |
| `durationSlow`      | 300ms | Page-level transitions |
| `durationSlower`    | 400ms | Complex choreography |
| `durationUltraSlow` | 500ms | Full-page animations |

Easing curves: `curveDecelerateMin`, `curveDecelerateMid`, `curveDecelerateMax`,
`curveAccelerateMin`, `curveAccelerateMid`, `curveAccelerateMax`,
`curveEasyEaseMax`, `curveLinear`.

#### B.6 Density Modes

The application must support at least two density modes:

- **Compact**: Reduced padding, smaller touch targets (min 24px), tighter line spacing.
  Suitable for power users and information-dense views.
- **Normal**: Standard padding, 32px minimum touch targets, comfortable line spacing.
  Default mode.
- **Spacious** (optional): Generous padding, 40px+ touch targets. Touch-friendly.

#### B.7 Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `borderRadiusNone`     | 0px  | Edges flush with container |
| `borderRadiusSmall`    | 2px  | Subtle rounding on inputs, badges |
| `borderRadiusMedium`   | 4px  | Cards, buttons, default rounding |
| `borderRadiusLarge`    | 8px  | Dialogs, panels, large containers |
| `borderRadiusXLarge`   | 12px | Hero cards, feature callouts |
| `borderRadiusCircular` | 50%  | Avatars, status indicators |

#### B.8 Component Patterns

All component patterns must match Fluent 2 reference implementations:

- **Pills/Tags**: Rounded, dismissible, with proper focus states
- **Cards**: Proper elevation, hover lift, content padding per Fluent 2 card spec
- **Dialogs**: Overlay dimming, focus trap, title/body/footer structure
- **Popovers**: Arrow positioning, dismiss-on-outside-click, proper shadow token
- **Navigation**: Breadcrumbs, tab bars, and sidebars per Fluent 2 patterns

#### Scoring Scale

| Score | Description |
|-------|-------------|
| 1--3  | **No Fluent 2 adherence.** Hardcoded colors, arbitrary spacing, no token usage. Custom font stacks. Generic CSS with no design system alignment. |
| 4--5  | **Partial token adoption.** Some Fluent 2 color tokens in use, but spacing and typography are inconsistent. Motion is absent or uses arbitrary durations. Some components follow Fluent 2 patterns, others do not. |
| 6--7  | **Mostly compliant.** Majority of colors, typography, and spacing use Fluent 2 tokens. Elevation system is in place. Motion tokens used for primary transitions. Minor inconsistencies in edge-case components. One density mode supported. |
| 8--9  | **Full compliance.** All color, typography, spacing, elevation, motion, and border radius values come from Fluent 2 tokens. All component patterns match Fluent 2 reference. Two or more density modes. Dark and light themes use correct Fluent 2 theme tokens. Zero hardcoded values. |
| 10    | **Exemplary Fluent 2 native feel.** Indistinguishable from a first-party Microsoft application. Advanced token usage (e.g., custom semantic aliases mapped to Fluent 2 primitives). Motion choreography across related elements. Density modes are seamless. Fluent 2 high-contrast theme supported. |

---

### C. UX Coherence (15%)

Evaluates visual consistency, interaction design, and accessibility.

| Score | Criteria |
|-------|----------|
| 1--2  | Inconsistent visual language across views. No keyboard navigation. No ARIA attributes. Loading states missing. Errors shown as raw strings. |
| 3--4  | Some visual consistency. Basic keyboard support (Tab works). Minimal ARIA roles. Loading spinners present but unstyled. Error messages exist but are generic. |
| 5--6  | Consistent theme across primary views. Keyboard shortcuts for common actions. ARIA landmarks and roles on main layout. Skeleton loading states. Error messages are user-friendly with suggested actions. |
| 7--8  | Full visual consistency across light and dark themes. Comprehensive keyboard shortcut system with discoverable hints. ARIA live regions for dynamic content. Focus management on route changes. Optimistic UI updates. Graceful degradation for offline/disconnected states. |
| 9     | All of 7--8, plus: reduced-motion support, high-contrast theme, screen reader testing verified, focus-visible rings per Fluent 2 spec, all interactive elements reachable via keyboard, logical tab order matches visual order. |
| 10    | All of 9, plus: WCAG 2.1 AA fully met. Custom keyboard shortcut editor. Animated transitions respect `prefers-reduced-motion`. Right-to-left layout support. Every interaction provides immediate visual and auditory feedback. |

---

### D. Architecture Fit (20%)

Evaluates alignment with CopilotHub's technical architecture.

#### D.1 MCP Patterns

- Correct `MCPClient` instantiation and lifecycle management
- Tool routing via typed discriminated unions
- SSE streaming with proper connection management (reconnect, backpressure)
- Request/response correlation IDs

#### D.2 Zustand Store Design

- Immer middleware for immutable updates
- Granular selectors (no full-store subscriptions)
- Store slicing per domain (not a single monolithic store)
- Computed/derived state via selectors, not stored state

#### D.3 Tauri IPC

- Rust commands with proper `#[tauri::command]` signatures
- Type-safe bridge (TypeScript types generated from or mirroring Rust types)
- Async command handlers with proper error propagation
- Sidecar process management where applicable

#### D.4 Separation of Concerns

- UI components contain zero business logic
- Data fetching isolated in hooks or service modules
- Tauri-specific code behind an abstraction layer (testable without Tauri runtime)
- MCP protocol details do not leak into UI layer

| Score | Criteria |
|-------|----------|
| 1--2  | No adherence to established patterns. Direct fetch calls in components. Single global store with no slicing. Tauri commands untyped. |
| 3--4  | Basic pattern awareness. Some store slicing. Tauri commands exist but error handling is minimal. MCP client is used but not abstracted. |
| 5--6  | Store sliced by domain with immer. MCPClient abstracted into a service layer. Tauri IPC typed on the TypeScript side. SSE connections managed but no reconnect logic. |
| 7--8  | Granular selectors everywhere. MCPClient with full lifecycle (connect/reconnect/disconnect). Tauri bridge is type-safe end-to-end. Clean separation: components -> hooks -> services -> IPC. All async operations cancellable. |
| 9     | All of 7--8, plus: store middleware for logging/persistence. MCP tool routing is declarative and extensible. Rust side has proper error enums with serde serialization. Integration test harness for IPC. |
| 10    | All of 9, plus: architecture is documented with decision records. New features can be added without modifying existing modules. Plugin-style extensibility for MCP tools. Store hydration/persistence strategy is production-grade. |

---

### E. Performance (10%)

| Score | Criteria |
|-------|----------|
| 1--2  | No code splitting. Full bundle loaded on startup. Visible jank on interactions. Memory leaks from unmanaged subscriptions or listeners. |
| 3--4  | Basic Vite chunking (vendor split). Some lazy-loaded routes. Occasional jank on heavy lists. Event listeners cleaned up inconsistently. |
| 5--6  | Vite tree-shaking effective (no dead code in bundle). Lazy loading on all non-critical routes. React 19 `useTransition` for expensive updates. Lists under 100 items render smoothly. Sidecar startup under 2 seconds. |
| 7--8  | Bundle size monitored and optimized (<500KB initial JS). Virtualized lists for large datasets (xterm.js buffer, MCP tool lists). React Suspense boundaries with meaningful fallbacks. Sidecar communication batched. No detectable memory leaks after 30 minutes of use. |
| 9     | All of 7--8, plus: critical rendering path optimized (first paint < 200ms in webview). CSS purged of unused rules. Image/icon assets optimized (SVG sprites or icon font). Web Workers for heavy computation. |
| 10    | All of 9, plus: performance budget enforced in CI. Lighthouse-equivalent audit scores above 95. Frame rate stays at 60fps during all interactions. Cold start to interactive under 1 second. |

---

### F. Innovation (10%)

| Score | Criteria |
|-------|----------|
| 1--2  | Straightforward implementation with no novel approaches. No cross-lane learning evident. |
| 3--4  | Minor improvements to existing patterns. Some awareness of other lanes' approaches. |
| 5--6  | One notable innovation (e.g., a novel MCP tool integration, a creative UI pattern). Some cross-lane ideas incorporated. |
| 7--8  | Multiple innovations that improve DX or user experience. Clear evidence of cross-lane inspiration. Forward-compatible design decisions (e.g., prepared for future MCP spec changes). |
| 9     | All of 7--8, plus: innovations that could be extracted as reusable libraries or patterns. Novel solutions to hard problems (e.g., offline-first MCP, collaborative editing). |
| 10    | All of 9, plus: paradigm-shifting approach that redefines how the feature should work. Community-shareable innovation. Patent-worthy novelty. |

---

### G. Completeness (5%)

| Score | Criteria |
|-------|----------|
| 1--2  | Feature is a stub or proof-of-concept. No documentation. Happy path only. |
| 3--4  | Core feature works. Minimal inline comments. Some edge cases handled. |
| 5--6  | Feature fully functional for primary use cases. README or doc section updated. Common edge cases handled (empty states, long strings, network timeout). |
| 7--8  | All use cases covered including edge cases. Documentation includes usage examples. Error states are comprehensive. Feature parity with specification. |
| 9     | All of 7--8, plus: migration guide if replacing existing functionality. Inline JSDoc on all public APIs. Edge cases include adversarial inputs (XSS prevention, overlong payloads). |
| 10    | All of 9, plus: interactive documentation or Storybook stories. Changelog entry. Release notes draft. Every acceptance criterion from the spec is demonstrably met with a test. |

---

## Automated Quality Gates

These gates are binary PASS/FAIL checks that run before human scoring begins. A
submission that fails any gate receives an automatic penalty or is disqualified.

| Gate | Command | Criteria | Consequence |
|------|---------|----------|-------------|
| TypeScript Compilation | `tsc --noEmit` | Zero errors | FAIL = submission not scored until fixed |
| Test Suite | `vitest run` | Minimum 80% pass rate | FAIL = -2.0 composite penalty |
| Regression Check | `vitest run` (baseline comparison) | All baseline tests pass | FAIL = submission not scored until fixed |
| Bundle Size Delta | `vite build` + size comparison | Warn if >10% increase over baseline | WARN = -0.5 composite penalty per 10% over threshold |
| Fluent 2 Token Audit | See audit script below | Zero ungoverned hardcoded color values | Each violation = -0.1 from Dimension B score |

### Fluent 2 Token Audit Script

Run the following to detect hardcoded color values that should use Fluent 2 tokens:

```bash
# Flag hardcoded hex colors in source files (excluding config/test files)
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "#[0-9a-fA-F]{3,8}\b" \
  src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "// fluent2-exempt" \
  | grep -v ".config." \
  | grep -v ".test."

# Flag rgb/rgba/hsl values
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "rgba?\([0-9]" \
  src/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "// fluent2-exempt"
```

Lines marked with `// fluent2-exempt` are excluded from the audit but must include a
justification comment explaining why the hardcoded value is necessary.

---

## Merge Decision Matrix

After all lanes are scored, use the composite scores to determine the merge strategy.

| Condition | Strategy | Description |
|-----------|----------|-------------|
| One lane >= 8.0, all others < 6.0 | **Winner-Take-All** | The highest-scoring lane is adopted wholesale. Other lanes are archived for reference. |
| Two lanes >= 7.0 | **Hybrid Merge** | The two qualifying lanes are merged feature-by-feature, taking the higher-scoring implementation for each feature. The third lane is archived. |
| All three lanes >= 6.0 | **Best-of-Breed** | Each feature is evaluated independently across all three lanes. The best implementation of each feature is selected and integrated. Requires careful integration testing. |
| All three lanes < 5.0 | **Restart** | All lanes are archived. A new hackathon round begins with revised specifications and lessons learned documented. |
| Two lanes >= 7.0, one >= 8.0 | **Hybrid Merge** (with lead) | Hybrid merge, but the 8.0+ lane serves as the base. Features from the other qualifying lane are merged in only where they score higher. |

### Tie-Breaking Rules

When two lanes have identical composite scores:

1. Higher Dimension B (Fluent 2 Design Compliance) score wins.
2. If still tied, higher Dimension D (Architecture Fit) score wins.
3. If still tied, higher Dimension A (Code Quality) score wins.
4. If still tied, the lane with fewer automated quality gate warnings wins.

---

## Score Sheet Template

Use one table per feature per lane. Copy this template for each evaluation.

### Per-Feature Score Sheet

```
Feature: ___________________________
Lane:    ___________________________
Judge:   ___________________________
Date:    ___________________________
```

| Dim | Dimension Name              | Weight | Raw (1-10) | Weighted | Judge Comments |
|-----|-----------------------------|--------|------------|----------|----------------|
| A   | Code Quality                | 0.20   |            |          |                |
| B   | Fluent 2 Design Compliance  | 0.20   |            |          |                |
| C   | UX Coherence                | 0.15   |            |          |                |
| D   | Architecture Fit            | 0.20   |            |          |                |
| E   | Performance                 | 0.10   |            |          |                |
| F   | Innovation                  | 0.10   |            |          |                |
| G   | Completeness                | 0.05   |            |          |                |
|     | **COMPOSITE**               | **1.00** |          | **___**  |                |

**Automated Gate Results:**

| Gate | Result | Notes |
|------|--------|-------|
| tsc --noEmit | PASS / FAIL |       |
| vitest run (pass rate) | ___% |       |
| Regression (existing tests) | PASS / FAIL |       |
| Bundle size delta | ___% |       |
| Fluent 2 token audit | ___ violations |       |

**Overall Assessment:**

```
Strengths:


Weaknesses:


Merge Recommendation:

```

### Lane Comparison Summary

Use this table after all lanes are scored for a given feature.

| Dimension | Lane 1 | Lane 2 | Lane 3 | Best |
|-----------|--------|--------|--------|------|
| A. Code Quality |  |  |  |  |
| B. Fluent 2 Design |  |  |  |  |
| C. UX Coherence |  |  |  |  |
| D. Architecture Fit |  |  |  |  |
| E. Performance |  |  |  |  |
| F. Innovation |  |  |  |  |
| G. Completeness |  |  |  |  |
| **Composite** |  |  |  |  |
| **Merge Decision** | | | | |

---

## Judging Process

1. **Pre-screening.** Run all automated quality gates. Record results. Any hard
   failures (tsc, regression) must be fixed before human review proceeds.

2. **Independent scoring.** Each judge scores each lane independently using the
   per-feature score sheet. Judges must provide written comments for any dimension
   scored below 5 or above 8.

3. **Calibration.** Judges meet to compare scores. Any dimension where judges
   diverge by more than 2 points is discussed and re-evaluated.

4. **Final scores.** Calibrated scores are averaged across judges. The composite is
   calculated using the weighted formula.

5. **Merge decision.** The merge decision matrix is applied to the final composite
   scores. The decision is documented with rationale.

6. **Integration.** The selected code is merged per the chosen strategy. A final
   round of automated gates is run on the merged result to confirm no regressions.

---

*This rubric is a living document. Propose changes via pull request to `docs/scoring-rubric.md`.*
