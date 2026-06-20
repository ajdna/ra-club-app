# Ruby Ankur Wellness — App Redesign Brief

A brief for Claude Design (beta). Goal: produce a polished, modern, "future-ready"
redesign of the Ruby Ankur Wellness club-management app. Hand the output back in the
formats listed under **Deliverables**, and it can be wired into the existing codebase.

---

## 1. Product in one paragraph

Ruby Ankur Wellness ("GUMS Club Manager") is a mobile-first PWA used by a wellness
club's owner, supervisors/coaches, and members to manage members, track weight and
attendance, run daily follow-ups, and message each other. It is used on phones, in
the field, often by non-technical coaches. Copy is **Hinglish** (Hindi written in
Latin script, mixed with English) — keep that voice.

## 2. Who uses it

- **Club owner** — sees everything; analytics, admin, role mapping, broadcasts.
- **Supervisors / coaches** — manage their downline members, follow-ups, messaging.
- **Members** — see their own progress, weight, streaks, chat with their coach.

Primary device: **phone, one-handed, mobile-first**. Must also work as an installed
PWA and inside an Android (Capacitor) shell.

## 3. Design direction (approved)

**Clean, minimal, Apple-like.** Calm and trustworthy, generous whitespace, one clear
accent, one hero element per screen, soft-rounded cards, restrained color, only two
type weights. Keep the warm wellness identity but make it feel premium and modern.
A reference mockup of four screens (login, home, members, messaging) has already been
approved — match its spirit: airy layout, a single emerald accent, a warm terra touch.

Avoid: dense dashboards, heavy borders, drop-shadow stacking, more than ~2 accent
colors per screen, decorative gradients/glows.

## 4. Brand tokens — SOURCE OF TRUTH (from the live codebase)

These already exist in `src/app/globals.css` as CSS variables and Tailwind theme
colors. **Design against these names** so the result maps 1:1 to code. Light values
shown; dark-mode values exist for all of them (the app supports system + manual dark
mode, so every screen must be designed in **both light and dark**).

| Token (CSS var / Tailwind) | Light hex | Role |
|---|---|---|
| `--cream` / `bg-cream` | `#f5f0e6` | App background (warm ivory) |
| `--cream-2` | `#ede5d4` | Secondary surface |
| `--card` / `bg-card` | `#fffefb` | Card surface |
| `--emerald` / `text-emerald` | `#1a5e32` | **Primary** — deep forest green (logo) |
| `--emerald-2` | `#236b3c` | Primary hover |
| `--terra` / `text-terra` | `#e07228` | **Accent** — saffron orange |
| `--terra-d` | `#b55d18` | Accent hover |
| `--sage` / `--sage-d` | `#6b8f5e` / `#4a6642` | Supporting leaf green |
| `--ink` / `text-ink` | `#1c1409` | Text (warm near-black) |
| `--gold` | `#c89a3c` | Awards / ambassador tiers |
| `--good` / `--warn` / `--bad` | `#2e7d4f` / `#c8902b` / `#b04830` | Success / warning / error |
| `--line` | `#e0d8c6` | Dividers / borders |

**Type:** `--font-sans` = **Manrope** (UI), `--font-display` = **Fraunces** (serif,
for big headings/branding). Keep two weights only (regular + medium/semibold).

> Note: the approved mockup used a slightly brighter emerald (`#0E7C5A`) and white-ish
> surfaces for an even cleaner feel. You may **propose refined values** for the green
> and the background, but if you do, deliver them as a drop-in replacement for the
> tokens above (same names) plus a short rationale — don't invent a parallel system.

## 5. Foundations to define

- **Color**: confirm/extend the ramp above; ensure WCAG AA contrast in light AND dark.
- **Type scale**: display (Fraunces) + UI (Manrope). Define sizes for h1/h2/h3, body,
  caption, and the "one big number" metric style. Two weights max.
- **Spacing**: an 8px-based scale.
- **Radius**: soft, generous (cards ~16–18px, pills full). One scale.
- **Elevation**: minimal — prefer hairline borders over shadows; define at most 1–2
  subtle shadow levels.
- **Icons**: outline style, consistent stroke (the app can use Tabler/Lucide-style).
- **States**: default / hover / pressed / focus (visible ring) / disabled / loading
  (the app already uses a shimmer skeleton) / empty / error.

## 6. Screens to design (priority order)

Design each at **phone width (~390px)** first; note tablet/desktop where relevant.
Light + dark for each.

1. **Login / onboarding** — wordmark + tagline, email/password, primary CTA, forgot
   password, create-account link. Also: registration and the "pending approval" state.
2. **Home dashboard** — greeting, one hero metric (today's follow-ups) with a small
   trend line, 4 quiet stat tiles (Members / Due today / Team / Overdue), an "up next"
   follow-up list, bottom tab bar.
3. **Members list** — search, segmented filter (All / Active / New), member rows with
   avatar, name, stage chip, weight + trend. Empty and loading states.
4. **Member profile** — header, current weight + goal, **weight chart over time**,
   stage/progress tracker, attendance, quick actions (log weight, mark present,
   message), intake summary.
5. **Messaging** — thread list AND a conversation view (chat bubbles, accent for the
   user's own messages, input bar). Also broadcast composer.

Secondary (style only, no full layouts needed unless time allows): follow-ups screen,
admin console, analytics, profile/settings, my-progress (member view), alerts.

## 7. Components to specify (with all states)

App bar / screen header · bottom tab bar (Home, Members, Chat, More) · metric/stat
card · hero card · list row (member, follow-up, thread) · avatar (initials + colors) ·
chips/pills (stage, filter, status) · buttons (primary, secondary, text, icon) · text
inputs / search field · segmented control · chat bubble (in/out) · message input bar ·
weight chart · progress/stage tracker · modal/sheet · toast (e.g. streak) · empty
state · skeleton loader.

## 8. Constraints (so it maps to code)

- **Stack**: Next.js 16 (App Router, RSC), React 19, **Tailwind CSS v4** (tokens via
  `@theme` in `globals.css`), mobile-first, PWA + Capacitor Android.
- Design with **Tailwind-friendly** values (8px spacing, standard radii) and the
  **existing token names** so styles translate to utility classes.
- **Light and dark mode are both required** for every screen and component.
- Touch targets ≥ 44px. One-handed reach: primary actions reachable near the bottom.
- Keep Hinglish copy; don't anglicize the voice.

## 9. Deliverables (please hand back in these forms)

So this can be incorporated into the code with minimal translation, return:

1. **Screen designs** — each priority screen (Section 6), **light + dark**, at phone
   width. Static frames are fine; an interactive/Figma version is a bonus.
2. **A token sheet** — final colors, type scale, spacing, radius, elevation. Ideally as
   either (a) a `globals.css` snippet using the **same CSS-variable names** as Section
   4, or (b) a small `tokens.json`. If any token value changes, say which and why.
3. **Component specs** — each component in Section 7 with its states, sizes, and which
   tokens it uses.
4. **Redlines / spacing notes** for the home and member-profile screens (the two most
   layout-heavy).
5. **Asset exports** — logo/wordmark and any icons, as SVG, plus PNG previews of each
   screen for quick review.

Naming: match the existing token names where possible; flag any additions.

## 10. How it gets used afterward

The returned designs + token sheet will be mapped onto the existing Tailwind theme in
`globals.css` and the existing components (`src/components`, `src/app/**`), screen by
screen, behind the smoke-test + CI gates already in place. So: the closer the token
names and values are to Section 4, the faster and safer the implementation.

---

*Reference: the approved 4-screen concept (login, home, members, messaging) in the
clean-minimal emerald direction. Build on that look and feel.*
