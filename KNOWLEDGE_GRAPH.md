# Knowledge Graph + Handoff — operating guide

Two cheap memories keep token cost down across sessions. This file says how to **use** and
**maintain** them, and gives the exact sub-agent prompts to dispatch.

---

## 1. The graph (read side — saves the most tokens)

- Location: `../graphify-out/` (in `CLUB APP/`, one level above this repo; **not** in git).
- Built by the `graphify` skill over the whole `CLUB APP/` folder (code + design HTML + docs).
- Last build: 694 files → 1127 nodes / 1799 edges / 108 communities, cost ~350K in / 117K
  out tokens. **Rebuilding from scratch is expensive — only ever do incremental `--update`.**

**Query instead of grepping.** From `CLUB APP/`:

```
graphify query "where is registration validated and what RPC does it call"
graphify path "RegisterForm" "register_user_v2"
graphify explain "getCurrentUser"
```

Top hub nodes (your core abstractions): `getCurrentUser` (112 edges), `createClient()`
(105). Communities map to features: "User Approval & Role Actions", "Broadcast Messaging
Client", "Member Import & Task Generation", "Chat Thread Management", "Supabase RLS &
Hierarchy Schema", etc. Open only the files the graph points to.

---

## 2. Maintenance cadence (write side)

| Trigger | HANDOFF.md | Graph |
|---|---|---|
| Trivial edit (1 file, no behavior change) | optional | flag only (hook) |
| Feature / bugfix / schema change | **always update** | `--update` (incremental) |
| Several files / new module | **always update** | `--update`, review GRAPH_REPORT diff |

The `post-commit` hook writes `../graphify-out/.needs_update` on every commit, so staleness
is never silently lost. Run the actual refresh on the user's machine via **Claude Code**
(graphify installed persistently there). Incremental update command (from `CLUB APP/`):

```
/graphify ./ --update
```

It re-extracts only new/changed files against the cache, so a few changed files cost a
fraction of the full build.

---

## 3. Sub-agent dispatch prompts (parallel, on demand)

Dispatch with the **Agent** tool, `subagent_type="general-purpose"`, both in ONE message so
they run in parallel. Pick the cheapest capable model per the AGENTS.md routing policy.

### handoff-curator  (model: `sonnet`; `haiku` for a tiny delta)
> Read `D:\RA Club\CLUB APP\club-app\HANDOFF.md`. Update it to reflect these changes:
> <PASTE the concrete diffs / what changed / why / current state / next steps>. Rules: keep
> the existing section structure; update "Last updated" to today; keep it prose + tables, no
> fluff; do not invent test results — only record what was actually verified. Return ONLY a
> 3-line summary of what you changed (compressed).

### graphify-updater  (model: `haiku` to orchestrate; runs in Claude Code on the user machine)
> Working dir = `D:\RA Club\CLUB APP` (the graph root, parent of club-app). Run the graphify
> skill in incremental mode: `/graphify ./ --update`. This re-extracts only changed files.
> If graphify is not installed in this environment, do NOT do a full rebuild — instead write
> `graphify-out/.needs_update` with the changed file list and report "flagged, not built".
> After a successful update, return ONLY: nodes/edges delta + any new God Nodes + any new
> community (compressed). Do not paste the full report.

**Cost rule:** never spawn these for a one-line fix. Flag-and-defer (the hook) is cheaper.
Spawn only when a real feature/fix landed and context is worth preserving.

---

## 4. Why this saves tokens

- New session reads `HANDOFF.md` (~3K tokens) + targeted `graphify query` answers instead
  of re-reading dozens of files (tens of thousands of tokens).
- The graph is built once and only incrementally topped up.
- Maintenance is delegated to cheap models and confined to low-risk surfaces, while the
  `npm run verify` gate still judges correctness.
