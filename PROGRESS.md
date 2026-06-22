# Progress / Agent Memory

Append-only delta log. Newest at top. Workers read the top entries + `CONTEXT_PACK.md`
instead of re-deriving. Keep entries one-liners; compress with `caveman-compress` when long.

## 2026-06-22
- New brand logo (transparent source `public/logo-new.png`): cropped full -> `logo-home.png` (login) + emblem -> `logo-icon.png` (AppBar, on white tile, consistent both themes) + regenerated `icon-192/512/72.png`. Dark login variant `logo-home-dark.png` (cream wordmark) regenerated. AppBar img now `bg-white ... ring-1 ring-line`.
- Login logo dark variant: generated `public/logo-home-dark.png` (light/cream wordmark, emblem kept) via PIL region recolor; login swaps logo-home (light) <-> logo-home-dark (dark) by theme via `.brand-logo-light/.brand-logo-dark` CSS. globals.css + login/page.tsx.
- Login logo: removed white card (was a box on dark theme); logo-home now transparent + `.brand-logo` drop-shadow for soft 3D, with a faint light rim in dark mode for wordmark legibility. globals.css + login/page.tsx.
- Profile screen: tightened identity block in `src/app/(app)/profile/page.tsx` to match `Profile.dc.html` avatar/badge styling (terra-soft avatar circle, Fraunces name, emerald role pill); JSX/className only, no data/logic changes; lint clean (0 errors), `tsc --noEmit` clean; `npm run build` hit a sandbox "Bus error" unrelated to the diff (env/binary issue, not verified on this pass — recommend re-running build in a normal dev machine before merge).
- Architecture: added CONTEXT_PACK.md (shared brief), QA_AGENT.md (test role), this log. Orchestration policy in AGENTS.md + ORCHESTRATION_WORKFLOW.md.
- Design rollout DONE (light+dark tokens): login, home, members, messages, profile. Brand = "Ruby Nutrition Center". Logos transparent: logo-home (login only), logo-icon (AppBar).
- Messages screen polished via Sonnet sub-agent, Opus-reviewed (clean).
- Gate = `npm run lint && npm run build`; React-Compiler eslint rules OFF; `.claude/**`+`design/**` ignored.
- OPEN: light/dark visual match-check on deployed site (needs screenshots — Chrome MCP blocks the vercel.app domain; PWA is WebView2).
- OPEN (optional): regenerate Supabase types to remove `as any` in followup/actions.ts.
