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
