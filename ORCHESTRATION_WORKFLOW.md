# Agent Orchestration Workflow

A routing policy for handling each request at the lowest cost that still meets the
quality bar. Steps map to: evaluate → pick skill → pick model/effort → dispatch →
verify → loop.

## 1. Evaluate the request (triage)

Classify before doing anything:

| Class | Looks like | Route |
|-------|-----------|-------|
| Trivial | one fact, rename, typo, status check | answer inline, no tools, no subagent |
| Standard | 1–3 file edit, focused feature, single screen | inline tools, sonnet |
| Complex | multi-file refactor, architecture, tricky bug | opus, plan first, verify hard |
| Research | "find/compare/gather", broad search | Explore/search subagent, summarize |
| Multi-part | several independent deliverables | split → parallel subagents |

Write a one-line plan for Standard+; a short task list for Complex/Multi-part.

## 2. Pick the skill (minimize tokens, keep quality)

- Match the task to ONE primary skill; don't load skills "just in case".
- Read only the files/sections needed — scope `Read`/`Grep`, never dump whole trees.
- For output formats (docx/pptx/xlsx/pdf) research first, load the format skill last.
- Reuse context already in the conversation instead of re-reading.
- Token discipline beats cleverness: smaller prompts, targeted diffs, no re-stating.

## 3. Pick model + effort

| Model | Use for |
|-------|---------|
| `haiku` | mechanical edits, formatting, extraction, bulk simple files, cheap checks |
| `sonnet` | default — features, screens, normal debugging, most coding |
| `opus` | architecture, subtle bugs, cross-cutting refactors, final review of high-stakes work |
| `fable` | only if a task specifically calls for it |

"Effort" = depth of thinking + rigor of verification, scaled to risk:
- low risk / reversible → do it, light check
- high risk / irreversible (deploys, deletes, money, auth, schema) → plan, confirm, verify hard

## 4. Dispatch

- Default: do it **inline** (cheapest — no cold-start re-derivation).
- Spawn a **subagent** only when: (a) work is independent and heavy, (b) it needs
  isolation (worktree), or (c) parallelism saves wall-clock on 2+ unrelated tasks.
- When spawning, set the **model** to the cheapest capable tier from step 3, give a
  tight prompt, and request a compressed result (findings only, not file dumps).
- Parallel: launch independent subagents in one batch; never fork tasks that share
  state or must run in sequence.

## 5. Verify (always, scaled to risk)

Pick the check that actually proves correctness:
- code → typecheck + lint + build (the existing gate) and/or tests
- UI → screenshot the deployed page, compare to design (light + dark)
- facts/research → cross-check sources
- data/math → recompute programmatically
- high-stakes → a fresh subagent reviews the diff (reviewer role)

No success claim without evidence from a check.

## 6. Loop

- If verification fails: read the actual error, fix the root cause, re-verify.
- Bound it: ~3 attempts. If still failing, stop and report what's blocking +
  options — don't thrash or silently `--no-verify`.
- Escalate model/effort one tier if a cheaper attempt keeps missing.

## Honest limits

- Cannot change this chat's own model per turn, call non-Claude models, or set a raw
  "effort" number — model choice + verification rigor are the levers.
- Parallel subagents cost tokens (cold context each). Use them for genuine
  independence/heavy lifting, not as a default.
- Destructive/irreversible actions always pause for confirmation, regardless of route.
