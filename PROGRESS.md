# Progress / Agent Memory

Append-only delta log. Newest at top. Workers read the top entries + `CONTEXT_PACK.md`
instead of re-deriving. Keep entries one-liners; compress with `caveman-compress` when long.

## 2026-06-22
- Architecture: added CONTEXT_PACK.md (shared brief), QA_AGENT.md (test role), this log. Orchestration policy in AGENTS.md + ORCHESTRATION_WORKFLOW.md.
- Design rollout DONE (light+dark tokens): login, home, members, messages, profile. Brand = "Ruby Nutrition Center". Logos transparent: logo-home (login only), logo-icon (AppBar).
- Messages screen polished via Sonnet sub-agent, Opus-reviewed (clean).
- Gate = `npm run lint && npm run build`; React-Compiler eslint rules OFF; `.claude/**`+`design/**` ignored.
- OPEN: light/dark visual match-check on deployed site (needs screenshots — Chrome MCP blocks the vercel.app domain; PWA is WebView2).
- OPEN (optional): regenerate Supabase types to remove `as any` in followup/actions.ts.
