<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Breaking changes — APIs, conventions, file structure may differ from training data. Read relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent orchestration (routing policy)

Follow this on every request. Full version: `ORCHESTRATION_WORKFLOW.md`.

1. **Triage** the request: trivial → answer inline (no tools); standard (1–3 files) → inline, sonnet; complex (architecture, cross-file, subtle bug) → opus, plan first; research → search/Explore subagent; multi-part independent → split into parallel subagents.
2. **Skill + tokens**: match ONE primary skill; read only the files/sections needed (never dump whole trees); reuse conversation context; load output-format skills (docx/xlsx/pptx/pdf) only after research.
3. **Model/effort**: `haiku` for mechanical/bulk-simple work, `sonnet` default, `opus` for hard reasoning or high-stakes review. "Effort" = thinking depth + verification rigor, scaled to risk.
4. **Dispatch**: prefer inline (cheapest). Spawn subagents only when work is independent and heavy, needs isolation, or true parallelism helps — set each to the cheapest capable model and ask for compressed (findings-only) output. Never fork tasks that share state or must run in sequence.
5. **Verify** (always, scaled to risk): code → typecheck/lint/build + tests; UI → screenshot deployed page vs design (light + dark); facts → cross-check sources; math/data → recompute. No success claim without evidence.
6. **Loop**: on failure, fix root cause and re-verify; cap at ~3 attempts, then stop and report blockers + options. Never bypass the pre-push gate with `--no-verify`.

Destructive/irreversible actions (deploys, deletes, payments, auth/schema changes) always pause for explicit confirmation, regardless of route.

# Token automation (apply by default)

- **get-shit-done hooks** are wired in `.claude/settings.json` and auto-fire **in the
  Claude Code runtime** (`gsd-context-monitor` watches context; `prompt/read/workflow
  guards` + `validate-commit` protect quality/security). Run unattended/headless agents
  through **Claude Code** on this repo so these fire automatically. They do NOT apply in
  Cowork chat.
- **Caveman compression is scoped, never global.** Use terse/caveman style ONLY on:
  worker sub-agent prompts + their returned summaries, commit messages, and code-review
  comments. Do NOT compress: security/architecture reasoning, RLS/auth analysis, or
  user-facing prose — full clarity there protects quality.
- **Memory hygiene:** keep `CONTEXT_PACK.md` + `PROGRESS.md` lean. When `PROGRESS.md`
  grows long, run the `caveman-compress` skill on it (preserves code/paths/URLs exactly;
  backs up the original). Workers read pack + recent deltas only.
- Net intent: lower cost + longer context, with quality preserved because compression is
  confined to low-risk surfaces and the verify gate still judges correctness.

# Project memory: knowledge graph + handoff (READ FIRST, WRITE LAST)

Two persistent memories exist so a new session never re-reads the whole tree:

- **`HANDOFF.md`** (this repo root) — current state, recent fixes, next steps. Prose
  source of truth for "what's going on right now".
- **Graphify knowledge graph** at `../graphify-out/` (one level up, in `CLUB APP/`, NOT in
  git). `graph.json` (1100+ nodes), `GRAPH_REPORT.md` (god nodes, communities), built by
  the `graphify` skill over the whole `CLUB APP` folder.

## On session START (every session, before touching code)
1. Read `HANDOFF.md` first. It tells you current state + next steps — usually enough to
   start without grepping.
2. For "where is X / what calls Y / how does Z work" questions, **query the graph instead
   of grepping the tree**: `graphify query "<question>"` (run from `CLUB APP/`, the graph
   root). The graph already maps the codebase — `getCurrentUser` and `createClient()` are
   the top hub nodes; communities map 1:1 to features. This is far cheaper than re-reading
   files. Only open files the graph points you to.

## On session END / after any non-trivial change (before declaring done)
1. **Update `HANDOFF.md`** — what changed, why, current state, next steps. Always. This is
   non-negotiable; it is how the next agent avoids re-deriving context.
2. **Mark the graph stale** so it gets refreshed: the `post-commit` hook writes
   `../graphify-out/.needs_update` automatically. When code/docs changed materially, run
   `/graphify ../  --update` (incremental — re-extracts only changed files, cheap). Run
   it reliably on the user's machine via **Claude Code** (graphify is installed there);
   a throwaway Cowork sandbox has no persistent graphify install.

## Delegating these two jobs (parallel sub-agents)
When a change is done and you want context maintained without burning the main context
window, dispatch BOTH in one message (they are independent):

- **handoff-curator** — updates/reads `HANDOFF.md`. Cheapest model that writes clean prose
  (`sonnet`, or `haiku` for a small delta). Works in any environment.
- **graphify-updater** — runs the incremental graph refresh. Needs graphify installed →
  Claude Code on the user's machine. In Cowork it can only flag staleness.

Exact dispatch prompts + model tiers live in `KNOWLEDGE_GRAPH.md`. Keep their returned
output compressed (findings only). Never spawn them for trivial edits — flag-and-defer is
cheaper; the hook already handles staleness.
