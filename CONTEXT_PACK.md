# Context Pack — Ruby Nutrition Center

Compact, authoritative brief for sub-agents. Read THIS first instead of re-deriving.
Durable facts only. For code you will edit, open the actual file (paths below) — do
NOT rely on summaries of editable code. Keep this file lean; append deltas, never
re-summarize the whole thing.

## Stack
Next.js 16 (App Router, RSC) · React 19 · Tailwind CSS v4 · Supabase (SSR + RLS) ·
Capacitor (Android) · PWA. Mobile-first. Copy voice: **Hinglish**.

## Brand
Name: **Ruby Nutrition Center**. Logos: `public/logo-home.png` = login screen ONLY;
`public/logo-icon.png` = top bar on every other screen (in `src/components/AppBar.tsx`).
Both transparent PNGs.

## Design tokens — source of truth: `src/app/globals.css`
Use ONLY existing Tailwind utilities; never invent hex/colors.
Surfaces `bg-cream bg-cream-2 bg-card` · brand `text-emerald bg-emerald-soft
text-terra bg-terra-soft text-sage-d bg-sage/15` · text `text-ink text-ink-2
text-ink-3` · status `text-good text-warn text-bad` · borders `border-line` ·
radius `rounded-[14px]/[16px]/[18px]` and `rounded-full` · soft shadow
`shadow-[0_8px_18px_var(--emerald-soft)]` / `shadow-[0_14px_30px_var(--emerald-soft)]`.
Fonts: `font-display` (Fraunces) for headings, default Manrope. Two weights only
(400/500/600-ish). Sentence case. Light + dark both required (tokens auto-flip).

## Design references
Per-screen target markup: `design/screens/{Onboarding,Home,Members,Messaging,Profile}.dc.html`.
Full brief: `DESIGN_BRIEF.md`. Tokens export: `design/tokens.json`.

## Key files
- App shell / top bar: `src/components/AppBar.tsx` (logo-icon + theme toggle), `src/components/BottomNav.tsx`
- Screens: `src/app/login/page.tsx`, `src/app/(app)/page.tsx` (home),
  `src/app/(app)/members/{page.tsx,MembersList.tsx}`,
  `src/app/(app)/messages/page.tsx`, `src/app/(app)/profile/page.tsx`
- Auth: `src/lib/auth.ts` · Supabase clients: `src/lib/supabase/*`

## Hard rules (do not break)
- **Never change data/logic when restyling**: leave Supabase queries, RLS paths,
  server actions, `getCurrentUser`, redirects, props, routing/hrefs untouched. JSX/
  className only, unless the task explicitly says otherwise.
- Anything touching Supabase RLS / auth / schema, or the follow-up engine = do NOT
  delegate; flag for Opus/owner.
- New `<img>` → add `{/* eslint-disable-next-line @next/next/no-img-element */}` above.
- Gate = `npm run lint && npm run build` (eslint flat config; React-Compiler rules are
  OFF, `rules-of-hooks` + `exhaustive-deps` ON; `.claude/**` and `design/**` ignored).
  Code must stay lint + build clean.

## Verify (always)
Run/assume the pre-push gate. Never bypass with `--no-verify`. UI changes: confirm
both light and dark. Report a short summary + any risk; do not commit/push.

## Routing
See `ORCHESTRATION_WORKFLOW.md` (and `AGENTS.md`). Sub-agents: read this pack + the
specific design `.dc.html` + the actual file to edit; do the delta; return a summary.
