# Progress / Agent Memory

Append-only delta log. Newest at top. Workers read the top entries + `CONTEXT_PACK.md`
instead of re-deriving. Keep entries one-liners; compress with `caveman-compress` when long.

## 2026-06-22 — delete thread (initiator)
- Feature: initiator can delete a whole broadcast/direct/group thread (removes from ALL recipients). RLS migration `chat_threads_delete` (coach_id = app_user_id()) APPLIED to prod + saved supabase/migrations/20260622000000_chat_thread_delete.sql. FK cascade already removes messages/reads/members/reactions.
- `deleteThread(threadId)` action (initiator-only guard) in messages/actions.ts. New DeleteThreadButton.tsx (confirm dialog). Wired: messages list rows (only when thread.coachId===myId) + thread detail header (initiator). clearThread (delete messages only) kept separate.

## 2026-06-22 — live test:e2e
- features.spec.ts: 6/6 PASS (account menu, Profile nav, Help panel, Plan->followup, /log, Logout). App features verified working live.
- Fixed STALE specs (false failures, not app bugs): login redesign changed button "Login"->"Log in" and replaced text heading with logo. Updated authed.spec.ts + public.spec.ts to `/^log in$/i` and tagline check.

## 2026-06-22 — QA pass (account menu / nav / log page)
QA agent, static verification (source read directly, no live build/dev/Playwright run — see note). All 4 features PASS, no e2e selector mismatches found.

1. PASS — Top-bar account menu (`src/components/AppBar.tsx`): button `aria-label="Account menu"` (L89) toggles dropdown (L96-114) with Profile `Link href="/profile"` (L100-103), Help button opening panel (L104-107, panel L119-163) with "Help & support" (L123) + "...coach se sampark..." (L129) + upline coaches mapped with `tel:` Call links (L138-154), Logout button (L108-111) calling `supabase.auth.signOut()` then `router.push("/login")` (L52-57). Coaches passed from `src/app/(app)/layout.tsx` L64 `<AppBar coaches={upline} />`, `upline` built by walking `parent_id` chain from `users` table (L44-57).
2. PASS — Bottom nav (`src/components/BottomNav.tsx`): `COACH_ITEMS` 5th entry `{ href: "/followup", label: "Plan", ... }` (L30); `MEMBER_ITEMS` 5th entry `{ href: "/log", label: "Log", ... }` (L38); no "Profile" item in either array. Routes confirmed to exist: `src/app/(app)/followup/page.tsx` and `src/app/(app)/log/page.tsx`.
3. PASS — Log page (`src/app/(app)/log/page.tsx`): number input L54-61 (`type="number"`), "Mark me present today" button text L94 (toggles to "Present marked" after success, L88-92). Imports `logMyWeight, markMyAttendance` from `../my-progress/actions` (L4) — both exist in `src/app/(app)/my-progress/actions.ts` (L15, L32) with matching signatures; no invented data/logic, server actions untouched.
4. PASS — `e2e/features.spec.ts` selector cross-check: every selector matches rendered markup — `getByRole("button", {name:/account menu/i})`, link "Profile", button "Help", button "Logout", text `/help & support/i`, text `/coach se sampark/i`, link "Plan" → `/followup`, `input[type="number"]` + button `/present today/i` on `/log`, login: placeholder "you@example.com" (login/page.tsx L185), `input[type="password"]` (L198), button `/^log in$/i` (L230, text "Log in"). No mismatches found.

**Lint/build note (environment):** `npm run lint` was run from the Linux sandbox mount and reported 4 parse errors (`AppBar.tsx`, `BottomNav.tsx`, `(app)/layout.tsx`, `login/page.tsx`) plus pre-existing unused-var warnings elsewhere. Investigated: the mounted copies of the 3 recently-edited files are **truncated** relative to the real source (e.g. mounted `BottomNav.tsx` = 96 lines cut off mid-attribute `font-mediu`, real file = 104 complete lines; `AppBar.tsx` mounted = 75 lines vs real 167; `layout.tsx` mounted = 47 vs real 73) — a sandbox sync-lag artifact, not a real defect. Confirmed by reading the authoritative source directly (Windows path `D:\RA Club\CLUB APP\club-app\...`): all three files are well-formed, balanced JSX/braces, proper closing tags. `tsc --noEmit` on the mount independently reproduced the same line numbers, consistent with truncation (not a flaky parser). **Lint/build could not be validated from this sandbox this run — re-run `npm run lint && npm run build` on a normal machine/CI before merge**, per the environment note in this task (`next build`/dev/Playwright are known-unreliable here). `npm run test:e2e` likewise not run live; spec/markup cross-check above is the static substitute.

## 2026-06-22
- Bottom nav 5th slot (Profile moved to top-bar menu): coaches -> "Plan" (/followup); members -> "Log" (new /log page = self weight + mark-present, reusing logMyWeight/markMyAttendance from my-progress/actions). BottomNav.tsx + new src/app/(app)/log/page.tsx.
- AppBar: top-bar logo now blends (no white tile/box). Added account dropdown right of theme toggle -> Profile (/profile), Help (modal: upline coaches name+role+tel call, "contact your coach" msg), Logout (supabase signOut). Upline chain computed in (app)/layout.tsx and passed as `coaches`.
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
