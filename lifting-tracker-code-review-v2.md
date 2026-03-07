# Lifting Tracker - Code Review v2 (Corrected)
**Date:** February 24, 2026  
**Scope:** Validate prior review claims + prioritize real risks  
**Code inspected:** `app.js`, `db.js`, `sw.js`, `index.html`, `style.css`

## Verdict on the prior review
The prior review is directionally useful, but several concrete claims are incorrect or stale. Treat it as a rough UX/code-health pass, not a precise audit.

## Findings (ordered by priority)

### 1. [P1] UX consistency debt is real and visible
**Impact:** The app mixes native `confirm()` flows with custom modal flows, which feels inconsistent and causes behavior differences across browsers.  
**Evidence:** Multiple native confirms in `/Users/tacita/Projects/lifting-tracker/app.js` (examples: lines `841`, `941`, `1500`, `2316`, `2596`) while folder management also uses custom modals.

### 2. [P1] Sync failure handling is mostly silent
**Impact:** If cloud sync fails, users can keep using the app but may assume data is synced when it is not.  
**Evidence:** Sync calls often `catch` only with `console.error` and no user-visible retry state in `/Users/tacita/Projects/lifting-tracker/db.js` (`pushLocalSnapshotToCloud`, `scheduleCloudSync`) and `/Users/tacita/Projects/lifting-tracker/app.js` (`cancelWorkout`, `signOut`).

### 3. [P2] Runtime config + service worker path is a key operational risk
**Impact:** Cache/config mismatches can make auth appear broken on phones despite working on desktop. This has already happened in practice.  
**Evidence:** Special-case handling for `config.js` in `/Users/tacita/Projects/lifting-tracker/sw.js:51` confirms this is a fragile path.

### 4. [P2] File size/monolith complexity is high
**Impact:** Regression risk rises as features are added; harder to reason about side effects.  
**Evidence:** `/Users/tacita/Projects/lifting-tracker/app.js` is ~2705 LOC and `/Users/tacita/Projects/lifting-tracker/db.js` is ~1008 LOC.

### 5. [P3] Local storage writes lack quota/exception UX
**Impact:** Rare, but if browser storage is constrained, settings/theme/config writes can fail without user feedback.  
**Evidence:** direct `localStorage.setItem(...)` calls in `/Users/tacita/Projects/lifting-tracker/app.js` and `/Users/tacita/Projects/lifting-tracker/db.js`.

## Claims from prior review that are incorrect

1. **"`SEEDED_USERS_KEY` is unused"** — incorrect. It is read/written in `/Users/tacita/Projects/lifting-tracker/db.js:485` and `/Users/tacita/Projects/lifting-tracker/db.js:495`.
2. **"`authSubscription` is unused"** — incorrect. It gates auth listener registration and is assigned from Supabase subscription in `/Users/tacita/Projects/lifting-tracker/db.js:375` and `/Users/tacita/Projects/lifting-tracker/db.js:395`.
3. **"`clearTemplateSelection()` is unused"** — incorrect. It is called in multiple edit/save/cancel flows in `/Users/tacita/Projects/lifting-tracker/app.js`.
4. **"Some errors use `alert()`"** — currently not true in app code. Current flow is mostly `showToast(...)` + `confirm(...)`.

## Security posture (practical)

- **No immediate critical app-layer issue found** in this pass.
- Supabase anon key being client-visible is expected for browser apps; safety comes from Supabase auth + RLS policy correctness, not key secrecy.
- Escaping discipline appears reasonable (`escapeHtml`) where dynamic HTML strings are used.

## Recommended next actions

1. Standardize destructive actions on one confirmation system (prefer custom modal).
2. Add user-visible cloud sync state (`syncing`, `failed`, `retry`) instead of console-only errors.
3. Keep mandatory service-worker cache bump discipline for any user-visible deploy.
4. Gradually split `app.js` by feature (`workout`, `templates`, `history`, `auth-ui`) to reduce regression scope.

