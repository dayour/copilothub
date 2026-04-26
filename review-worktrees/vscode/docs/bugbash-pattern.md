# Dual Bugbash Validation Pattern

CopilotHub 3-Lane Hackathon -- Adversarial Quality Protocol

---

## Overview

This document defines the two-phase bugbash validation pattern used by the CopilotHub 3-Lane Hackathon. Every lane (O, A, D) must pass both phases before merge eligibility.

**Stack:** Tauri 2.x + React 19 + Rust desktop application (`E:\copilothub`)

**Test toolchain:** vitest + @testing-library/react + jsdom

**Build toolchain:** tsc + vite build

**Lanes:**

| Lane | Provider | Description |
|------|----------|-------------|
| O | OpenAI | OpenAI integration lane |
| A | Anthropic | Anthropic integration lane |
| D | Dayour/DAYOURBOT | DAYOURBOT integration lane |

**Design system:** All UI must comply with Microsoft Fluent 2 (<https://fluent2.microsoft.design/>).

---

## Phase 1: Internal Bugbash (Self-Validation)

Each lane validates its own work before exposing it to cross-lane review.

### 1.1 Automated Gates

All five gates must pass. Any failure blocks Phase 2 entry.

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| TypeScript | `tsc --noEmit` | Zero errors, zero warnings treated as errors |
| Unit Tests | `npm run test` | All tests pass, no skipped tests without justification |
| Build | `npm run build` | Exit code 0, no build warnings in production config |
| Regression | Diff against main test suite | No pre-existing tests broken |
| Coverage | New code inspection | Every new module/component has corresponding tests |

### 1.2 Fluent 2 Compliance Checks

All UI changes must be audited against Microsoft Fluent 2 design tokens. Violations are treated as bugs.

| Rule | Requirement | Bad Example | Correct Example |
|------|-------------|-------------|-----------------|
| Color tokens | No hardcoded hex/rgb colors; use Fluent 2 semantic tokens | `color: #0078d4` | `color: var(--colorBrandBackground)` |
| Spacing grid | All spacing values must be multiples of 4px | `padding: 10px` | `padding: var(--spacingVerticalM)` (12px) |
| Typography | Use Segoe UI Variable with Fluent 2 type ramp | `font-size: 15px` | `font-size: var(--fontSizeBase300)` |
| Elevation | Use shadow tokens, not arbitrary box-shadow | `box-shadow: 0 2px 4px rgba(...)` | `box-shadow: var(--shadow4)` |
| Border radius | Use Fluent 2 radius tokens | `border-radius: 6px` | `border-radius: var(--borderRadiusMedium)` |
| Motion | Use duration and easing tokens | `transition: 0.3s ease` | `transition: var(--durationNormal) var(--curveEasyEase)` |

### 1.3 Manual Self-Review Checklist

Before declaring Phase 1 complete, the lane lead reviews:

- [ ] Feature completeness: all acceptance criteria met
- [ ] Edge cases: empty states, max-length inputs, network failures handled
- [ ] Theme compatibility: dark mode, light mode, and enterprise-blue must all render correctly using Fluent 2 tokens (no hardcoded overrides)
- [ ] Keyboard accessibility: all interactive elements reachable via Tab, activatable via Enter/Space, focus indicators visible
- [ ] MCP interaction: all Model Context Protocol calls handle timeouts, malformed responses, and provider unavailability
- [ ] Zustand state cleanliness: no orphaned subscriptions, selectors are granular, no unnecessary re-renders
- [ ] Memory: no detectable leaks under repeated mount/unmount cycles (check via React DevTools profiler or equivalent)

---

## Phase 2: Cross-Lane Bugbash (Adversarial)

### 2.1 Assignment Matrix

Each lane tests the other two. No lane reviews its own code.

| Reviewing Lane | Tests Lane(s) |
|----------------|---------------|
| O (OpenAI) | A + D |
| A (Anthropic) | O + D |
| D (Dayour) | O + A |

### 2.2 Bug Filing Protocol

Every bug must be filed with the following fields:

| Field | Format | Required |
|-------|--------|----------|
| Bug ID | `{filing_lane}-{seq}` (e.g., `O-001`) | Yes |
| Severity | Critical / High / Medium / Low | Yes |
| Priority | P0 / P1 / P2 / P3 | Yes |
| Title | One-line summary | Yes |
| Steps to Reproduce | Numbered step list | Yes |
| Expected Behavior | What should happen | Yes |
| Actual Behavior | What actually happens | Yes |
| Affected Component | Module or file path | Yes |
| Fluent 2 Violation | Yes/No + detail if yes | Yes |
| Is Regression | Yes/No | Yes |
| Description | Additional context, screenshots | No |
| Resolution | Fix description when resolved | No |

### 2.3 Severity Matrix

| Severity | Description | Response Time | Fix Requirement |
|----------|-------------|---------------|-----------------|
| Critical | Data loss, crash, security hole, complete feature failure | Immediate | Must fix before any merge |
| High | Major functionality broken, significant Fluent 2 violation visible to users, accessibility blocker | Within 2 hours | Must fix before lane merge |
| Medium | Minor functionality issue, cosmetic Fluent 2 deviation, non-blocking UX problem | Within 4 hours | Should fix; may defer with justification |
| Low | Polish item, minor inconsistency, suggestion for improvement | Best effort | May defer to post-hackathon backlog |

### 2.4 Review Focus Areas

Cross-lane reviewers should prioritize adversarial testing in these categories:

1. **Error injection** -- Force network failures, invalid API keys, malformed provider responses. Verify graceful degradation.
2. **State corruption** -- Rapid provider switching, concurrent MCP calls, store mutations during async operations. Verify Zustand state remains consistent.
3. **MCP edge cases** -- Oversized payloads, missing required fields, duplicate tool registrations, timeout cascades.
4. **Provider switching** -- Switch between O/A/D providers mid-conversation, mid-stream, and during error states. Verify no orphaned state.
5. **Concurrent operations** -- Multiple tabs, rapid clicks, overlapping API calls. Verify no race conditions.
6. **Fluent 2 visual regressions** -- Token misuse (hardcoded values where tokens exist), broken elevation layering, incorrect spacing on density mode changes, theme switching glitches.

---

## Bug Triage Protocol

A triage panel (one representative per lane) reviews all filed bugs and assigns disposition.

### Fix-Forward vs Revert Decision Tree

The triage panel applies the following rules in order:

```
IF any single Critical bug AND estimated fix time > 2 hours:
    REVERT the offending change

ELSE IF 2 or more Critical bugs in the same lane:
    REVERT the offending change

ELSE IF 5 or more High bugs AND estimated fix time > 50% of remaining hackathon time:
    REVERT the offending change

ELSE:
    FIX-FORWARD (patch in place)
```

**Revert procedure:**

1. Identify the minimal set of commits to revert.
2. Create revert commit(s) on the lane branch.
3. Re-run all Phase 1 automated gates.
4. Notify the affected lane lead.

**Fix-forward procedure:**

1. Assign bug to lane owner.
2. Lane owner creates fix commit(s) referencing the Bug ID.
3. Re-run all Phase 1 automated gates.
4. Cross-lane reviewer who filed the bug verifies the fix.

---

## Sign-Off Gates

All of the following must be satisfied before a lane is merge-eligible:

| Gate | Requirement | Verified By |
|------|-------------|-------------|
| Critical/High bugs | All resolved (fixed or verified-not-a-bug) | Triage panel |
| Test suite | `npm run test` passes, zero failures | Automated |
| TypeScript | `tsc --noEmit` clean, zero errors | Automated |
| Lane approval | 2-of-3 lanes approve (the two cross-reviewers) | Lane leads |
| Architect integrity | Architect confirms no structural regressions | Architect |
| Evaluation gates | Evaluation agent confirms all automated gates green | dayour-evaluation |
| Fluent 2 audit | No unresolved Fluent 2 violations of severity High or above | Design review |

---

## Merge Ceremony

Once all lanes pass sign-off:

1. **Create integration branch** from `main`.
2. **Apply lane branches per DAG order** -- if lane D depends on shared utilities modified by lane O, merge O first.
3. **Run full test suite after each lane merge.** If tests fail, stop and resolve before proceeding.
4. **Resolve conflicts** -- when two lanes conflict on the same file, the lane with the higher bugbash score (fewer bugs found, faster resolution) takes priority. The lower-scoring lane adapts.
5. **Final validation** -- run all Phase 1 automated gates on the integration branch.
6. **Tag release** -- `vX.Y.Z-hackathon` with a summary of all three lanes' contributions.

---

## Bug Tracking SQL Schema

Use this schema in the session database to track bugs during the bugbash:

```sql
CREATE TABLE bugbash_bugs (
    id TEXT PRIMARY KEY,
    filed_by_lane TEXT NOT NULL,
    found_in_lane TEXT NOT NULL,
    severity TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    affected_component TEXT,
    is_fluent2_violation BOOLEAN DEFAULT FALSE,
    fluent2_violation_detail TEXT,
    is_regression BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'open',
    resolution TEXT,
    filed_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);
```

### Common Queries

```sql
-- All open Critical/High bugs for a lane
SELECT id, severity, title, filed_by_lane
FROM bugbash_bugs
WHERE found_in_lane = 'O' AND status = 'open' AND severity IN ('Critical', 'High')
ORDER BY severity, filed_at;

-- Fluent 2 violations by lane
SELECT found_in_lane, COUNT(*) as violation_count
FROM bugbash_bugs
WHERE is_fluent2_violation = TRUE AND status = 'open'
GROUP BY found_in_lane
ORDER BY violation_count DESC;

-- Regressions only
SELECT id, severity, title, found_in_lane, affected_component
FROM bugbash_bugs
WHERE is_regression = TRUE AND status = 'open'
ORDER BY severity;

-- Sign-off readiness check: any blocking bugs?
SELECT found_in_lane, COUNT(*) as blocking_count
FROM bugbash_bugs
WHERE status = 'open' AND severity IN ('Critical', 'High')
GROUP BY found_in_lane;
```

---

## Quick Reference

**Phase 1 pass criteria:** All 5 automated gates green + Fluent 2 audit clean + manual self-review complete.

**Phase 2 pass criteria:** All cross-lane bugs triaged, all Critical/High resolved, sign-off gates satisfied.

**Revert trigger (any one):** 1 Critical with fix > 2h, 2+ Criticals, or 5+ Highs with fix > 50% remaining time.

**Merge order:** DAG dependency order, test after each merge, conflict priority to higher-scoring lane.
