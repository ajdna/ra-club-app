# Project Execution, Go-Live & Sustainment Plan

> **Status:** Draft for owner review · **Date:** 2026-06-27 · Owner: Ankur
> **Companion docs:** `feature-roadmap-and-test-plan.md` (what & why), `AGENTS.md` (orchestration policy), `KNOWLEDGE_GRAPH.md` (memory), `HANDOFF.md` (live state).
> **Build model:** solo, via Claude Cowork + Claude Code (+ ZCode optional). No paid services until a field trial proves feasibility.

This plan turns the roadmap into an **executable, repeatable pipeline** — same steps for every feature — with the right tool/model/agent per step, version control with one-click restore, and a sustainment routine so the app stays healthy after go-live.

---

## 1. Scope (locked with owner)

| Decision | Answer |
|---|---|
| **Phase 1** | `followup`, `health-score`, `identity`, `hierarchy` + admin approval queue |
| **Phase 2** | `dmo`, `recognition`, weight-trend chart, intake UI |
| **Phase 3** | `marathon`, PWA offline, treasury (re-evaluate) |
| **food-logging** | **Deferred** (revisit after retention loop proven) |
| **treasury** | **Cut from v1** (payment/fraud/regulatory scope) |
| **Versioning** | Per-feature branch + git tag + Vercel instant rollback + reversible migrations |
| **Cost** | ₹0 new spend now; field-trial first, invest later |

---

## 2. The three tools — who does what (and how to save tokens)

You have three AI surfaces. Use the cheapest one that fits; never do in an expensive surface what a cheap one does well.

| Tool | Best at | Use it for | Avoid for |
|---|---|---|---|
| **Claude Code** (terminal, in-repo) | Writing/editing code with full repo context; running `npm run verify`, git, Playwright; `graphify --update` (persistent install); GSD hooks auto-fire (context monitor, commit validator) | **All implementation**, TDD, refactors, running tests, commits/tags, graph refresh | Cross-app/MCP work (no Supabase/Vercel/Chrome connectors) |
| **Claude Cowork** (this) | Orchestration, planning, MCP connectors (Supabase DB + migrations, Vercel deploys, Chrome live-tests), design, doc/HANDOFF/graph upkeep | Specs, DB schema apply, deploy checks, live UI tests, approvals, keeping HANDOFF + graph current | Bulk code editing (no GSD hooks; pricier per edit than Code) |
| **ZCode AI** | Secondary implementer / spec author (it wrote the roadmap) | Isolated, well-specified sub-tasks (boilerplate, test stubs) when you want a parallel hand | Anything touching auth/RLS/migrations — keep those single-source in Code+Cowork to avoid drift |

**Golden rule for consistency across three tools:** `HANDOFF.md` + the graph are the single source of truth. Every tool **reads them first** and **updates HANDOFF last**. Whoever finishes a unit of work updates HANDOFF before handing off.

### Token-saving workflow (applies in every session, every tool)
1. **Start:** read `HANDOFF.md`; for "where is X / how does Y work", run `graphify query` instead of grepping the tree. (Saves the biggest chunk.)
2. **Implement in Claude Code**, not Cowork — GSD hooks keep context lean automatically, and local edits don't round-trip through chat.
3. **Delegate heavy/independent work to scoped sub-agents** with compressed (findings-only) output; pick the cheapest capable model (below).
4. **Caveman compression** only on worker prompts, commit messages, code-review comments — never on security/RLS/architecture reasoning or user-facing copy.
5. **Per-feature branch** keeps each diff small → smaller context → cheaper review.
6. **End:** update HANDOFF (handoff-curator), run `graphify ./ --update` (incremental, cheap). The post-commit hook already flags the graph stale.

### Does graphify actually help? Yes — on all three axes
- **Effort/tokens ↓:** a new Claude Code / ZCode / Cowork session answers "where is X / what calls Y / what does changing Z touch" from one `graphify query` instead of grepping dozens of files. That's the single biggest per-session saving.
- **Consistency ↑:** all three tools reason about the *same* architecture map, so they don't drift. God nodes (`getCurrentUser`, `createClient`) show a change's blast radius **before** you edit.
- **Speed ↑:** faster orientation + impact analysis; onboarding a fresh session is seconds, not a re-read.
- **Caveat:** it's a *map, not ground truth*. Keep it fresh (incremental `--update` is free for code) and verify exact current state against the file before relying on it. Stale graph = misleading; that's why the post-commit hook flags it.

---

## 2.5 How we run together — ownership tags + checkpoints

Every step is tagged so you never guess who runs it:
- 🟢 **I handle here (Cowork):** migrations, deploys, live tests, diff review, HANDOFF + graph upkeep, model/agent routing.
- 🔵 **Run in Claude Code:** I give the exact branch + commands; you paste back the result/errors.
- 🟡 **You do it:** approvals in Supabase/Vercel, App Store, anything destructive/irreversible.

**Per feature, only 3 checkpoints need you** — I drive everything between them:
1. **Spec approve** (before any code)
2. **Pre-merge review** (after `verify` is green)
3. **Go-live** (flip the `rule_config` flag on)

This is the most cost-saving division: hard reasoning + connector work happens once here; bulk code edits happen in Claude Code (cheapest, GSD hooks); HANDOFF is the baton.

---

## 3. Model & agent assignment — the standard pipeline

Every feature runs the **same 10 stages**. This table is the default routing; deviate only with reason.

| # | Stage | Tool | Model | Agent / mode | Why |
|---|---|---|---|---|---|
| 0 | **Locate / investigate** | Code or Cowork | `haiku` | `cavecrew-investigator` (compressed) | Cheap read-only mapping of where code lives |
| 1 | **Spec the feature** | Cowork | `opus` | `Plan` agent / inline | One-time hard thinking; cheap because done once |
| 2 | **Design-system pass** | Cowork | `sonnet` | `design:design-system` | Tokens + component states before UI (see §6) |
| 3 | **Schema + reversible migration** | Cowork | `opus` | inline (Supabase MCP) | RLS/migrations are high-stakes — full reasoning, no compression |
| 4 | **Module + server actions** | Code | `sonnet` | `cavecrew-builder` (1–2 files) or inline | Bounded edits; sonnet is the default |
| 5 | **UI screens** | Code | `sonnet` | inline | Component work against the design tokens |
| 6 | **Unit tests** (pure logic) | Code | `sonnet` | `test-driven-development` | Planner/score math etc.; write test first |
| 7 | **E2E tests** (Playwright) | Code | `sonnet` | inline | Per roadmap §4 test plan |
| 8 | **Verify gate** | Code | — | `npm run verify` (lint+build) | Hard gate; no `--no-verify` |
| 9 | **Review** | Code or Cowork | `opus` (high-risk) / `sonnet` | `cavecrew-reviewer` | Diff review before merge; opus for auth/RLS/payments |
| 10 | **Go-live + verify on prod** | Cowork | `sonnet` | inline (Vercel + Chrome MCP) | Deploy check, live smoke test, tag, HANDOFF, graph |

Mechanical/bulk work (renames, formatting, enum bumps) → `haiku`. High-stakes reasoning (RLS, auth, money, data migration) → `opus`, never compressed.

### Model & effort quick-pick (set this in Claude Code per step)

| Work type | Model | Effort / thinking |
|---|---|---|
| Locate code, renames, enum bumps, boilerplate, commit msgs | `haiku` | Low — no extended thinking; terse/caveman prompt |
| Modules + actions + UI + tests (the everyday default) | `sonnet` | Medium — normal thinking |
| RLS/auth, schema migrations, cross-file refactor | `opus` | High — add "think hard" (extended thinking on) |
| Final review of a money / auth / data-migration diff | `opus` | Highest — "ultrathink", verify twice |

**Rule: effort scales to blast radius, not to how big the edit looks.** A one-line change to a **god node** (`getCurrentUser`, `createClient` — the graph shows their reach) is high-effort because it touches everything downstream. An isolated, well-bounded edit is low-effort even if it's many lines. In Claude Code: choose the model in the selector; raise effort by adding `think hard` / `ultrathink` to the prompt on the high rows; keep the low rows terse.

---

## 4. Per-feature execution checklist (repeat for each)

Each feature is a card. Copy this block per feature; fill the specifics row.

```
[ ] 0. Branch:   git checkout -b feat/<name>            (from up-to-date main)
[ ] 1. Spec:     write/confirm spec in the feature's section of HANDOFF
[ ] 2. Design:   confirm tokens/components exist; extend via design-system
[ ] 3. DB:       write migration UP + documented DOWN; apply to a Supabase BRANCH first
[ ] 4. Flag:     add rule_config feature flag (default OFF) — kill switch
[ ] 5. Code:     module + actions + UI (gated by the flag)
[ ] 6. Tests:    unit (pure logic) + E2E (Playwright), per roadmap §4
[ ] 7. Verify:   npm run verify  → green
[ ] 8. Review:   cavecrew-reviewer diff; fix; re-verify
[ ] 9. Merge:    merge Supabase branch (schema) → merge git branch → tag vX.Y-<name>
[ ] 10. Deploy:  push → Vercel auto-deploy → smoke test on prod (Chrome)
[ ] 11. Enable:  flip the rule_config flag ON for a pilot cohort
[ ] 12. Record:  update HANDOFF; run graphify ./ --update; note the release tag
```

### Phase 1 feature specifics

| Feature | Branch | Migration (reversible) | Feature flag | Effort | Rollback note |
|---|---|---|---|---|---|
| `followup` (extract module) | `feat/followup-module` | none (refactor only) | `followup_v2` | Low-Med | pure code → Vercel rollback / git revert |
| `health-score` | `feat/health-score` | `+health_scores` table + daily cron | `health_score_v2` | Med | drop table on down; flag off reverts UI to `health.ts` proxy |
| `identity` (approval queue) | `feat/identity-approvals` | none (RPCs exist) | `approval_queue` | Med | UI-only; flag off hides queue |
| `hierarchy` (team tree) | `feat/hierarchy-tree` | none (closure table exists) | `team_tree` | Med | UI-only; pure rollback |

> Phase 2/3 features follow the identical 12-step card; specifics get filled when their phase starts.

---

## 5. Version management & restore (one-click-ish)

Four independent layers, each individually revertible — so a bad release never traps you.

1. **Code / UI — git + Vercel.**
   - Per-feature branch → squash-merge to `main` → annotated tag `vMAJOR.MINOR-<feature>` at each go-live.
   - **Restore:** Vercel dashboard → Deployments → previous READY build → **"Promote to Production"** (instant, no rebuild). Or `git revert <sha>` + push. Every prod deploy is a tagged rollback point.

2. **Database — reversible migrations + Supabase branch.**
   - Every migration file carries a **`-- DOWN:` block** documenting the exact reverse (drop table/column/policy).
   - Risky schema changes go to a **Supabase branch** first (`create_branch` → test → `merge_branch`); never straight to prod.
   - **Restore:** run the DOWN block, or reset the branch. (Point-in-time restore only if/when on a paid tier — noted, not assumed.)

3. **Feature flags — `rule_config`.**
   - Every new feature ships **gated behind a `rule_config` flag, default OFF**. This is the cheapest kill switch: disable a misbehaving feature **without a redeploy**, instantly, for everyone or a cohort.

4. **Knowledge — HANDOFF + graph.**
   - HANDOFF records every release tag + what changed. The graph is refreshed per merge. A new session can reconstruct state and even *why* a rollback happened.

**Release tag convention:** `v0.<phase>.<feature-n>` (e.g. `v0.1.2-health-score`). Pre-field-trial stays in the `v0.x` range.

---

## 6. Design-system governance (from /design-system)

Quality stays consistent only if the visual layer is governed, not improvised.

- **Phase 0 task:** run `/design-system audit` once — catalog tokens in `globals.css`, flag hardcoded hex/spacing, score component completeness (states/variants/docs). Fix the top offenders before adding screens.
- **Per feature (stage 2):** before building UI, confirm the needed components exist with all states (default/hover/active/disabled/loading/error). Missing pattern → `/design-system extend` to spec it (props, variants, states, a11y) **before** coding.
- **Token versioning:** treat `globals.css` tokens as versioned API. A breaking token change (rename/remove) needs a migration note in HANDOFF and a find-replace pass — never silently repurpose a token.
- **Consistency rule:** no new hardcoded colors/spacing in feature work; use tokens. The reviewer (stage 9) checks this.

---

## 7. Go-live checklist (per feature, before flipping the flag ON)

```
[ ] verify gate green (lint + build)
[ ] unit + E2E tests pass locally
[ ] deployed to Vercel, state READY on the feature's commit
[ ] live smoke test on prod (Chrome MCP): happy path + one rejection path
[ ] reversible migration confirmed applied; DOWN block verified on the branch
[ ] release tagged; Vercel rollback candidate confirmed
[ ] HANDOFF updated; graph refreshed
[ ] flag ON for pilot cohort (not everyone day 1)
[ ] watch Sentry + logs for 24–48h before full rollout
```

---

## 8. Sustainment & maintenance (after go-live)

| Cadence | Task | Tool |
|---|---|---|
| **Continuous** | Sentry error monitoring (already wired); triage new issues | Cowork (logs) / Code (fix) |
| **Daily (automated)** | Morning/evening cron health; push delivery; scheduled E2E (`e2e-scheduled.yml`) | CI |
| **Per merge** | `graphify ./ --update`; HANDOFF update | Code |
| **Weekly** | Review flags (retire stale ones); check cron + push success rates; dependency security advisories | Cowork |
| **Monthly** | `/design-system audit` drift check; prune graph stale nodes; review rollback points | Cowork |
| **As needed** | Incident runbook: disable via flag → diagnose (logs + graph) → fix on branch → verify → redeploy → re-enable | Code + Cowork |

**Field-trial gate (your call):** run Phase 1 with a small pilot cohort behind flags. Measure adoption + stability. Only after that prove out do we discuss any paid investment (food-logging calorie DB, native store apps, WhatsApp Business API).

---

## 9. Immediate next actions (on your approval)

1. Phase 0: `/design-system audit` + add the `rule_config` feature-flag helper (tiny, unblocks gated rollout).
2. Start `feat/followup-module` (lowest-risk, highest-moat) following the §4 card.
3. After each feature: tag, deploy, HANDOFF, graph — per §5/§7.

> Nothing here spends money. Every step has a documented undo. Review and tell me what to adjust — then I'll begin Phase 0.
