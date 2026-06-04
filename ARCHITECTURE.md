# ARCHITECTURE

A code-level walkthrough of the app, for someone reading the codebase for the first time. For the practice methodology this app implements, see [README.md](README.md). For the visual design system, see [DESIGN.md](DESIGN.md).

---

## 1. Overview

The Log Book is a music practice tracker. It is a Next.js 16 App Router application, written in TypeScript and React 19, backed by a Supabase Postgres database with row-level security. It is installable as a PWA, themed for light and dark mode, and deployed on Netlify at `thelogbook.studio`.

The app has four authenticated routes (`/dashboard`, `/log`, `/week`, `/settings`), a public landing page (`/`), a public demo (`/demo`), and a magic-link login (`/login`). All persistence goes through Supabase: there is no separate API server, and no client-side state library — pages are Server Components that read from Supabase, and writes happen via Next.js Server Actions defined in [src/lib/actions.ts](src/lib/actions.ts).

---

## 2. Stack and versions

Pulled from [package.json](package.json):

| Package | Version | Role | Docs |
|---|---|---|---|
| `next` | 16.2.6 | App Router framework, Server Components, Server Actions | https://nextjs.org/docs |
| `react` / `react-dom` | 19.2.6 | UI runtime | https://react.dev |
| `@supabase/supabase-js` | 2.105.4 | Database/Auth/Storage client | https://supabase.com/docs/reference/javascript |
| `@supabase/ssr` | 0.10.3 | Cookie-bound Supabase clients for server-side rendering | https://supabase.com/docs/guides/auth/server-side/nextjs |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | Styling. v4 uses CSS-first config (no `tailwind.config.*` file) | https://tailwindcss.com/docs |
| `shadcn` | 4.7.0 | Component generator — primitives live in [src/components/ui/](src/components/ui/) | https://ui.shadcn.com |
| `next-themes` | 0.4.6 | Light/dark/system theme toggle | https://github.com/pacocoursey/next-themes |
| `recharts` | 3.8.1 | Charts on `/dashboard` | https://recharts.org |
| `date-fns` | 4.1.0 | Date helpers | https://date-fns.org |
| `lucide-react` | 1.16.0 | Icons | https://lucide.dev |
| `@base-ui/react` | 1.4.1 | Headless dialog/select primitives used by shadcn | https://base-ui.com |
| `clsx`, `tailwind-merge`, `class-variance-authority` | — | Conditional classNames; used by [src/lib/utils.ts](src/lib/utils.ts) `cn()` |
| `tw-animate-css` | 1.4.0 | Tailwind animation utilities |
| `react-day-picker` | 10.0.1 | Used by shadcn `calendar.tsx` |
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` + `@dnd-kit/modifiers` | — | Touch/pointer/keyboard-accessible drag-and-drop for reordering exercises in settings | https://dndkit.com |
| `patch-package` | 8.0.1 | Persists a one-line fix to `next/dist/lib/fs/write-atomic.js` (see §13) | https://github.com/ds300/patch-package |

**Next.js 16 specifics that surprise people:**
- Middleware is `src/proxy.ts` (renamed from `middleware.ts`). See [src/proxy.ts](src/proxy.ts).
- Turbopack is the default bundler in dev; output goes to `.next/dev/` (not `.next/`).

---

## 3. Directory layout

```
.
├── ARCHITECTURE.md          ← this file
├── README.md                ← practice method, user-facing
├── DESIGN.md                ← visual design system
├── AGENTS.md / CLAUDE.md    ← short instructions for AI agents
├── components.json          ← shadcn config (base-nova style)
├── next.config.ts           ← Turbopack root + cache flag
├── tsconfig.json            ← strict TS, `@/*` → `src/*`
├── eslint.config.mjs        ← next/core-web-vitals + TS
├── postcss.config.mjs       ← Tailwind v4 plugin
├── package.json             ← scripts, deps, postinstall
├── patches/
│   └── next+16.2.6.patch    ← write-atomic mkdir fix
├── scripts/
│   └── generate-icons.sh    ← logo.pdf → icon.png / apple-icon.png
├── public/
│   ├── logo.pdf / .svg / .png   ← logo sources (SVG preferred)
│   ├── fonts/Thwack.ttf         ← display font
│   └── sw.js                    ← service worker
├── supabase/
│   └── schema.sql           ← single source of truth for DB
└── src/
    ├── proxy.ts             ← middleware: session refresh + auth gate
    ├── app/                 ← App Router pages, layouts, route handlers
    │   ├── layout.tsx       ← root layout: providers, fonts, shell
    │   ├── page.tsx         ← `/` landing (renders landing.tsx)
    │   ├── landing.tsx      ← landing page body
    │   ├── manifest.ts      ← PWA manifest
    │   ├── icon.png / apple-icon.png    ← PWA icons (file conventions)
    │   ├── globals.css      ← Tailwind import + staff-line background
    │   ├── design-tokens.css ← all color/radius CSS variables
    │   ├── error.tsx        ← global error boundary
    │   ├── not-found.tsx    ← 404 page
    │   ├── auth/callback/route.ts   ← OTP / PKCE callback
    │   ├── login/           ← magic-link form
    │   ├── dashboard/       ← charts + recent sessions
    │   ├── log/             ← daily session form
    │   ├── week/            ← weekly focus planner
    │   ├── settings/        ← config editor + account panel
    │   └── demo/            ← public demo (no auth)
    ├── components/
    │   ├── ui/              ← shadcn-generated primitives
    │   └── *.tsx            ← layout shell, providers, widgets
    └── lib/
        ├── actions.ts       ← every Server Action
        ├── supabase.ts      ← server + browser clients
        ├── supabase-browser.ts  ← thin convenience re-export
        ├── week.ts          ← local-TZ date helpers
        ├── utils.ts         ← cn()
        ├── features.ts      ← FEATURES array (info dialog content)
        ├── focus-colors.ts  ← color map for focus areas / day strip
        └── demo-data.ts     ← DEMO_FOCUS_NAMES + DEMO_SESSIONS
```

`_prototype/` exists at the project root but is an archived Streamlit prototype and is intentionally ignored.

---

## 4. Request lifecycle

A typical authenticated page load:

1. **Browser → Netlify CDN.** The custom domain `thelogbook.studio` resolves to a Netlify edge node.
2. **Middleware runs.** Next.js invokes the `proxy` function in [src/proxy.ts:4](src/proxy.ts#L4) on every request that matches the matcher at [src/proxy.ts:48-52](src/proxy.ts#L48-L52) (everything except static assets and images). The middleware:
   - Builds a cookie-bound Supabase client.
   - Calls `supabase.auth.getUser()` immediately. Supabase SSR requires no logic between client creation and `getUser()` — that call is what refreshes the session cookies. See https://supabase.com/docs/guides/auth/server-side/nextjs.
   - If the user is unauthenticated and the path is not in the public allow-list (`/`, `/login`, `/auth/*`, `/demo`), it redirects to `/login`. See [src/proxy.ts:34-43](src/proxy.ts#L34-L43).
3. **Server Component renders.** The route's `page.tsx` (e.g. [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)) is a Server Component. It calls `createServerClient()` from [src/lib/supabase.ts:16](src/lib/supabase.ts#L16), reads from Supabase, and renders.
4. **HTML streams to the client.** Client Components (marked with `"use client"`) hydrate. The root layout at [src/app/layout.tsx](src/app/layout.tsx) wraps everything in `TimerProvider`, `ThemeProvider`, `NavBar`, `Header`, and `BottomWidgets`.
5. **User interaction.** A client component submits a form or calls a Server Action exported from [src/lib/actions.ts](src/lib/actions.ts). The action runs on the server, writes to Supabase, and calls `revalidatePath(...)` to invalidate the cached page. The component then calls `router.refresh()` (or relies on the revalidation) and the page re-renders.

There is no REST API surface — every write goes through a Server Action. https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations.

---

## 5. Authentication

The app uses Supabase Auth in passwordless magic-link mode.

**Sending the link.** The `/login` form posts to the `sendMagicLink` action at [src/lib/actions.ts:61](src/lib/actions.ts#L61). It builds the redirect origin from request headers:

```ts
const host = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host") ?? "thelogbook.studio";
```

`x-forwarded-host` is checked first because Netlify sets the raw `host` header to an internal deploy URL (e.g. `opinionated-music-practice-app.netlify.app`), and we want magic-link URLs to point to the public domain.

**Verifying the link.** Supabase emails the user a link to `/auth/callback`, handled by [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts). It supports two query shapes:

- `?token_hash=…&type=…` — verified with `supabase.auth.verifyOtp()` ([route.ts:14-16](src/app/auth/callback/route.ts#L14-L16)). This is the primary path because the OTP flow works in webview email apps where cookies are isolated from Safari.
- `?code=…` — verified with `supabase.auth.exchangeCodeForSession()` ([route.ts:17-19](src/app/auth/callback/route.ts#L17-L19)). Legacy PKCE fallback.

On success, the callback redirects to the `next` query param (defaulting to `/dashboard`). On failure, it redirects to `/login?error=Could+not+authenticate`.

**Required Supabase dashboard settings.** For the above to work end-to-end:
- **Site URL:** `https://thelogbook.studio`
- **Redirect URLs:** `https://thelogbook.studio/**` and `http://localhost:3000/**`
- **Email template link:** `{{ .ConfirmationURL }}` (Supabase appends the right path automatically)

**Session persistence.** Both cookie-setting paths ([src/proxy.ts](src/proxy.ts) `setAll` and [src/lib/supabase.ts](src/lib/supabase.ts) `setAll`) spread `maxAge: 60 * 60 * 24 * 365` on top of the options Supabase provides, so the browser keeps auth cookies for a year. The middleware's `getUser()` call refreshes the underlying tokens on every request, so as long as the user visits within the Supabase project's refresh-token window (a server-side setting), they stay logged in indefinitely.

**Sign-out and delete account.** `signOut` at [actions.ts:48](src/lib/actions.ts#L48) calls `supabase.auth.signOut()`. `deleteAccount` at [actions.ts:54](src/lib/actions.ts#L54) calls the `delete_account` Postgres function — defined at [supabase/schema.sql:60-69](supabase/schema.sql#L60-L69) as a `security definer` function that cascades a delete across `session_logs`, `weekly_logs`, `user_info`, and `auth.users`.

---

## 6. Database schema

Source of truth: [supabase/schema.sql](supabase/schema.sql). Three tables, all row-level-security enabled, all scoped by `auth.uid() = user_id`.

### `user_info` — per-user config (one row per user)

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK to `auth.users`, **unique** |
| `spine` | jsonb | Spine exercises (warmup-style routine) |
| `focus_1`, `focus_2`, `focus_3` | jsonb | Three named focus areas |
| `weekly_focus` | jsonb | `{ weekly_A, weekly_B, weekly_C }` — labels for weekly planning categories |
| `weekly_goal_hours` | integer | Hours-per-week target for the practice ring on `/dashboard`. Default `3`. |

Each `spine` / `focus_*` JSONB has the shape:

```ts
{
  name: string;                 // e.g. "Guitar"
  all_ex: string[];             // full exercise pool
  focus_bool: boolean[];        // parallel array — is each exercise "on"?
  notes: string[];              // parallel array — exercise notes
  focus_ex: string[];           // derived: subset of all_ex where focus_bool is true
}
```

### `session_logs` — one row per `(user_id, date)`

Unique constraint on `(user_id, date)` ([schema.sql:25](supabase/schema.sql#L25)) — saving is an upsert. Columns:

- `date`, `week`, `year` — ISO week number is computed at save time via `getISOWeek` from [src/lib/week.ts:8](src/lib/week.ts#L8).
- `todays_focus` text — the focus area name (e.g. `"Guitar"`, `"Guitar + Voice"`, or `"Free"`).
- `exercises_finished` jsonb — `{ spine: ExerciseEntry[], primary: ExerciseEntry[], secondary: ExerciseEntry[] }`, each entry `{ exercise, sessionNotes, audioUrl? }`.
- `additional_notes` jsonb — `{ additional_notes, mood_stars, focus_stars, practice_duration }` (duration as `HH:MM:SS`).
- `completed` boolean.

### `weekly_logs` — one row per `(user_id, week_num, year)`

`focus_info` jsonb maps weekly-focus labels (from `user_info.weekly_focus`) to free-text notes. Example: `{ "Song": "Black Bird", "Key": "E major" }`.

### Storage

A public `session-audio` bucket ([schema.sql:46-57](supabase/schema.sql#L46-L57)) holds optional audio recordings attached to exercise entries. Policies enforce that the first path segment of any object name matches `auth.uid()`, so users can only read/write their own files.

### Why JSONB instead of normalized tables

The per-user config (3 focus areas, variable exercise count, parallel arrays for `focus_bool`/`notes`) is config data, not relational data. Keeping it as JSONB lets each page load a user's full config in one query, and lets the settings editor save the entire focus area atomically without managing FKs.

---

## 7. Routes

### `/` — landing
[src/app/page.tsx](src/app/page.tsx) is a one-line component rendering [src/app/landing.tsx](src/app/landing.tsx) — a static marketing-free description of the practice method with links to `/login`, `/demo`, and the GitHub repo. Reads `FEATURES` from [src/lib/features.ts](src/lib/features.ts).

### `/login`
[src/app/login/page.tsx](src/app/login/page.tsx) is a Server Component that reads `?message=` / `?error=` from `searchParams` and renders a magic-link form. The form's `action` is the `sendMagicLink` Server Action. The submit button is its own client component ([src/app/login/submit-button.tsx](src/app/login/submit-button.tsx)) that uses `useFormStatus()` to show "Sending…" while pending.

### `/auth/callback`
[src/app/auth/callback/route.ts](src/app/auth/callback/route.ts) is a Route Handler (not a page) — see §5.

### `/dashboard`
[src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) reads all of the user's `session_logs` and the three focus-area names + `weekly_goal_hours` from `user_info`, builds a focus-name → chart-color map with `buildFocusColorMap` from [src/lib/focus-colors.ts:9](src/lib/focus-colors.ts#L9), and renders `<DashboardClient>` ([src/app/dashboard/dashboard-client.tsx](src/app/dashboard/dashboard-client.tsx)). The client component renders:

- A `<PracticeRing>` ([src/app/dashboard/practice-ring.tsx](src/app/dashboard/practice-ring.tsx)) — Apple-Fitness-style SVG ring filled by total practice hours vs. goal. Shown only in Week and Month tabs; the goal scales as `weeklyGoal × (daysInMonth / 7)` in Month view. Hidden in All-time.
- A `MonthCalendar` (custom, Monday-aligned) from [src/app/dashboard/charts.tsx:19](src/app/dashboard/charts.tsx#L19) — color-coded heatmap of practice days.
- A `WeeklyStackedChart` (Recharts) — stacked hours by focus area per ISO week.
- A list of recent sessions with click-through to `/log?date=…`.

### `/log`
[src/app/log/page.tsx](src/app/log/page.tsx) is the daily session form. The page parses `?date=YYYY-MM-DD` (defaulting to today via `parseDateParam`), reads `user_info`, the existing `session_logs` row (if any), the current `weekly_logs` row, and the count of sessions this week. The "first session of the week" weekly-intentions prompt is computed at [log/page.tsx:36-38](src/app/log/page.tsx#L36-L38).

The client form [src/app/log/form.tsx](src/app/log/form.tsx) lets the user pick today's focus, toggle exercises, record per-exercise notes and audio, log mood/focus stars, run the timer, and save. Save calls `saveSession` at [actions.ts:96](src/lib/actions.ts#L96); delete calls `deleteSession` at [actions.ts:128](src/lib/actions.ts#L128). The timer is automatically stopped on save (via `stopTimer()` from `useTimer`).

Notable UX details in the form:
- **Spine checkboxes.** Each spine row has an opt-in checkbox; only checked rows are persisted to `exercises_finished.spine`. Backward compatible because rows previously in saved data are auto-checked on load. Typing into a spine notes field also auto-checks the row on the empty→non-empty transition.
- **"Have fun!" virtual exercise.** Every focus area's dropdown includes a synthetic `"Have fun!"` option (constant in `form.tsx`) that isn't stored in `user_info`. Always available, like the `"Free"` top-level focus.
- **Per-card save indicator.** A small `<SaveIndicator>` ("Saving…" / "Saved" / red "Error saving") renders in each editable `<ExerciseRow>` header. The indicator state is driven by the form-level `saveStatus`, fired both by the 2 s auto-save effect and by the manual `handleSave` button.

### `/week`
[src/app/week/page.tsx](src/app/week/page.tsx) loads the weekly-focus labels and any existing `weekly_logs.focus_info`. The client form [src/app/week/form.tsx](src/app/week/form.tsx) renders one textarea per active label and auto-saves on a 800 ms debounce — see [week/form.tsx:31-46](src/app/week/form.tsx#L31-L46). Save status (`idle | saving | saved | error`) is shown inline.

### `/settings`
[src/app/settings/page.tsx](src/app/settings/page.tsx) is the most involved server page. If `user_info` does not yet exist, it inserts a default config ([settings/page.tsx:27-62](src/app/settings/page.tsx#L27-L62)) with starter Guitar / Voice / Creative exercises, then redirects to `/settings`. Otherwise it renders four sections via [src/app/settings/editor.tsx](src/app/settings/editor.tsx):

- `FocusNamesForm` — rename the three focus areas (`saveFocusNames`)
- `ExerciseEditor` — edit exercises per category (`saveExercises`). Rows are drag-reorderable via `@dnd-kit/sortable`: each row carries a stable `_uid` and a `GripVertical` handle, and `arrayMove` + the existing debounced save persist the new order. Since `saveExercises` already writes `all_ex`/`focus_bool`/`notes`/`focus_ex` arrays in row order, the practice log automatically reflects the new ordering.
- `WeeklyLabelsForm` — rename weekly planning categories (`saveWeeklyLabels`)
- `WeeklyGoalForm` — set hours-per-week goal for the dashboard ring (`saveWeeklyGoal`)
- `AccountPanel` — show email, export CSV (`exportSessionsCSV`), sign out, delete account

All four use the same `useDebounce` hook at [editor.tsx:16-35](src/app/settings/editor.tsx#L16-L35) with try/catch so a failed save shows an "Error saving" message instead of getting stuck on "saving".

### `/demo`
[src/app/demo/page.tsx](src/app/demo/page.tsx) is a public route. It feeds `DEMO_SESSIONS` and `DEMO_FOCUS_NAMES` from [src/lib/demo-data.ts](src/lib/demo-data.ts) into the same `<DashboardClient>` the real dashboard uses, with a banner inviting sign-up.

### `error.tsx` / `not-found.tsx`
[src/app/error.tsx](src/app/error.tsx) is the global error boundary (a Client Component that receives `reset`); [src/app/not-found.tsx](src/app/not-found.tsx) is the 404 page. Both are branded to match the rest of the app.

---

## 8. Components

### Layout shell
- [src/components/app-shell.tsx](src/components/app-shell.tsx) — adds `md:ml-52` to offset content for the desktop sidebar on app routes, no-op on landing/login/auth.
- [src/components/nav.tsx](src/components/nav.tsx) — dual nav: bottom tab bar on mobile, left sidebar on desktop. Four tabs (Dashboard, Start Week, Log Session, Settings). Hidden on public routes.
- [src/components/header.tsx](src/components/header.tsx) — sticky 48 px top bar with mobile logo, page title, streak emoji + count (fetched via `getStreak` from [actions.ts:18](src/lib/actions.ts#L18) passing a local-TZ date string), the `InfoDialog` button, and the theme toggle. Hidden on `/`, `/login`, `/auth/*`.
- [src/components/page-container.tsx](src/components/page-container.tsx) — rounded card wrapper used by every authenticated page. `wide` prop bumps the max width from 2xl to 4xl (used by `/dashboard`).
- [src/components/site-footer.tsx](src/components/site-footer.tsx) — footer with GitHub/Instagram/LinkedIn links, used on `/` and `/login`.

### Providers and global state
- [src/components/theme-provider.tsx](src/components/theme-provider.tsx) — thin wrapper around `next-themes` (`attribute="class"`, `defaultTheme="system"`).
- [src/components/timer-context.tsx](src/components/timer-context.tsx) — practice timer that survives navigation. `TimerProvider` at [L28](src/components/timer-context.tsx#L28) wraps the whole app from `layout.tsx`. `useTimer()` exposes `elapsed`, `running`, `start`, `stop`, `reset`, `setElapsed`. Implementation uses a `requestAnimationFrame` tick that reads `Date.now()`, so the timer doesn't drift if the tab is backgrounded. `FloatingTimer` at [L84](src/components/timer-context.tsx#L84) is a floating pill that links to `/log`; it hides itself on public routes and when elapsed is zero.
- [src/components/bottom-widgets.tsx](src/components/bottom-widgets.tsx) — renders `<FloatingTimer>` + `<Metronome>` together. Holds a `metronomeCollapsed` state and threads it into `FloatingTimer` so the timer slides up above the expanded metronome panel.

### Widgets
- [src/components/metronome.tsx](src/components/metronome.tsx) — Web Audio API metronome. Schedules ticks ahead of time using the standard "lookahead scheduler" pattern ([metronome.tsx:107-115](src/components/metronome.tsx#L107-L115)). All audio reads go through `useRef`s rather than React state — UI state and refs are kept in sync via the setters at [L48-L80](src/components/metronome.tsx#L48-L80) — so the scheduler never sees stale values. Supports BPM 40-240, beats-per-bar 1-9, beat unit 2/4/8, accent pattern (beat 1 is always accented), random-accent mode, and tap tempo.
- [src/components/week-strip.tsx](src/components/week-strip.tsx) — 7-day strip used on `/log` and `/week`. Each day pill takes an optional CSS background from a `dayColors` map (single focus = solid color; dual focus = 50/50 gradient — see `buildDayColors` at [src/lib/focus-colors.ts:20](src/lib/focus-colors.ts#L20)).
- [src/components/info-dialog.tsx](src/components/info-dialog.tsx) — "How it works" modal. Auto-opens on first visit (gated by `localStorage["logbook_info_seen"]`). Renders the `FEATURES` array from `src/lib/features.ts`.
- [src/app/dashboard/practice-ring.tsx](src/app/dashboard/practice-ring.tsx) — SVG progress ring used only on `/dashboard`. Two concentric circles (background track + colored progress arc), animated `stroke-dashoffset`, brand color until 100% then a success green. Imports `formatDuration` from `dashboard-client.tsx` for the raw-hours line.

### Infra
- [src/components/sw-register.tsx](src/components/sw-register.tsx) — registers `/sw.js` on mount; silently swallows errors (e.g. unsupported browsers).

### UI primitives
[src/components/ui/](src/components/ui/) holds shadcn-generated primitives: `button`, `card`, `dialog`, `input`, `textarea`, `label`, `checkbox`, `select`, `separator`, `calendar`. These are not edited by hand — re-add them via `npx shadcn@latest add <name>` if needed. Style is `base-nova`, neutral base color, CSS variables enabled ([components.json](components.json)).

---

## 9. Server actions

Every server-side write lives in [src/lib/actions.ts](src/lib/actions.ts). The file opens with `"use server"`, then declares a `getUser()` helper at [L9](src/lib/actions.ts#L9) that fetches the current user and throws if unauthenticated. Every action calls it first.

| Export | Location | Role |
|---|---|---|
| `getStreak(todayStr?)` | [L18](src/lib/actions.ts#L18) | Count consecutive ISO **weeks** whose summed practice minutes (excluding `Free` / `Skipped`) reach `weekly_goal_hours × 60`, capped at 90 weeks. The current week being incomplete doesn't break the streak. Header renders the count as `🔥 Nw`. |
| `signOut()` | [L48](src/lib/actions.ts#L48) | Supabase sign-out, redirect to `/login`. |
| `deleteAccount()` | [L54](src/lib/actions.ts#L54) | Call the `delete_account` Postgres function, redirect to `/login`. |
| `sendMagicLink(formData)` | [L61](src/lib/actions.ts#L61) | Email magic link with origin derived from `x-forwarded-host`. |
| `saveSession(payload)` | [L96](src/lib/actions.ts#L96) | Upsert `session_logs` with `onConflict: "user_id,date"`; revalidates `/log` and `/dashboard`. |
| `deleteSession(date)` | [L128](src/lib/actions.ts#L128) | Delete a session by `(user_id, date)`. |
| `getExerciseHistory(exercise)` | [L136](src/lib/actions.ts#L136) | Last 50 days of entries for one exercise name — used in the log form's "history" panel. |
| `saveWeekLog(weekNum, year, focusInfo)` | [L159](src/lib/actions.ts#L159) | Upsert `weekly_logs` on `(user_id, week_num, year)`. |
| `exportSessionsCSV()` | [L185](src/lib/actions.ts#L185) | Build a CSV string of all sessions. CSV escaping is hand-rolled at [L170](src/lib/actions.ts#L170). |
| `saveFocusNames(names)` | [L227](src/lib/actions.ts#L227) | Patch the `name` field on `focus_1/2/3` JSONB. |
| `saveExercises(fieldName, categoryName, rows)` | [L253](src/lib/actions.ts#L253) | Replace the whole `spine` / `focus_*` JSONB. |
| `saveWeeklyLabels(labels)` | [L271](src/lib/actions.ts#L271) | Patch `weekly_focus` JSONB. |
| `saveWeeklyGoal(hours)` | — | Update `weekly_goal_hours`. Revalidates `/settings` and `/dashboard`. |

After every write, the action calls `revalidatePath(...)` to invalidate the relevant page's cache so the next render reads fresh data.

---

## 10. Lib utilities

- [src/lib/supabase.ts](src/lib/supabase.ts) — `createClient()` (browser, at [L8](src/lib/supabase.ts#L8)) and `createServerClient()` (cookie-bound, at [L16](src/lib/supabase.ts#L16)). The server one uses Next's `cookies()` and silently swallows cookie writes from Server Components, because Server Components can't set cookies — middleware handles session refresh. Both clients read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from env.
- [src/lib/supabase-browser.ts](src/lib/supabase-browser.ts) — thin re-export of `createBrowserClient`. Kept separate from `supabase.ts` so client modules don't accidentally pull in `next/headers`.
- [src/lib/week.ts](src/lib/week.ts) — `getISOWeek` at [L8](src/lib/week.ts#L8) returns ISO week/year plus the Monday-Sunday bounds. `formatDateParam` at [L34](src/lib/week.ts#L34) returns `YYYY-MM-DD` using local-TZ components (`getFullYear / getMonth / getDate`), **not** `toISOString()`, which would shift by one day for west-of-UTC users. `parseDateParam` at [L41](src/lib/week.ts#L41) parses `YYYY-MM-DD` at noon local to avoid the same hazard.
- [src/lib/utils.ts](src/lib/utils.ts) — single export `cn(...inputs)` = `twMerge(clsx(inputs))`. Standard shadcn helper.
- [src/lib/features.ts](src/lib/features.ts) — the `FEATURES` array used by the landing page and the info dialog. Each entry has a title, music symbol, paragraphs, and an optional tip.
- [src/lib/focus-colors.ts](src/lib/focus-colors.ts) — `CHART_COLORS` (four CSS-variable references), `buildFocusColorMap(names)` to map focus-area names to colors in user-config order, and `buildDayColors(sessions, map)` which handles single-focus (solid), dual-focus (`"A + B"` → 50/50 gradient), and `"Free" / "Skipped"` (muted gray).
- [src/lib/demo-data.ts](src/lib/demo-data.ts) — `DEMO_FOCUS_NAMES = ["Guitar", "Voice", "Creative"]` and ~50 hand-curated `DEMO_SESSIONS`. Dates are computed relative to `new Date()` using local-TZ components, so the demo always looks "fresh."

---

## 11. Styling system

- **Tailwind v4** via `@tailwindcss/postcss` ([postcss.config.mjs](postcss.config.mjs)). There is **no `tailwind.config.js`** — v4 uses CSS-first config. See https://tailwindcss.com/docs/v4-beta. Tailwind is imported from [src/app/globals.css](src/app/globals.css), which also defines the staff-line background pattern.
- **Design tokens** are CSS variables in `src/app/design-tokens.css` (imported from `globals.css`). All colors (`--brand`, `--bg-content`, `--fg-primary`, `--chart-1..4`, etc.), the radius scale (`--radius-lg`), and shadcn's variable mappings live there. Dark mode is a `.dark` class override on the same variables. The design intent is documented in [DESIGN.md](DESIGN.md).
- **shadcn** is configured via [components.json](components.json) with `style: "base-nova"`, `cssVariables: true`, and `baseColor: "neutral"`. Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`.
- **Theme switching** is provided by `next-themes` ([src/components/theme-provider.tsx](src/components/theme-provider.tsx)) with `attribute="class"`. The toggle button is in [Header.tsx:56-64](src/components/header.tsx#L56-L64). `mounted` is gated to avoid hydration mismatch.
- **Fonts:** "Thwack" (a VT323-style pixel display font) loaded locally from `public/fonts/Thwack.ttf` via `next/font/local`, and "Karla" loaded from Google Fonts via `next/font/google`. Both are declared in [src/app/layout.tsx:13-23](src/app/layout.tsx#L13-L23) and exposed as `--font-vt323` and `--font-karla`.
- **Component styling pattern:** most components mix Tailwind utility classes (layout, sizing) with inline `style` blocks that reference CSS variables (`style={{ background: "var(--bg-content)" }}`) for theme-reactive colors. This lets palette changes flow purely through `design-tokens.css`.

---

## 12. PWA setup

- **Manifest:** [src/app/manifest.ts](src/app/manifest.ts) is a Next.js file-convention manifest (https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest). `start_url: "/dashboard"`, `display: "standalone"`, theme color matches `--brand`.
- **Icons:** [src/app/icon.png](src/app/icon.png) (512 px) and [src/app/apple-icon.png](src/app/apple-icon.png) (180 px) — also file conventions. Next.js auto-wires them into HTML head and the manifest.
- **Service worker:** [public/sw.js](public/sw.js) is a minimal network-first SW. It does **not** pre-cache any routes (an earlier version did, but pre-caching auth-protected routes caused a `SecurityError` unhandled rejection). It does add a fallback to the cache if the network fetch throws. Registered by [src/components/sw-register.tsx](src/components/sw-register.tsx).
- **Logo regeneration:** [scripts/generate-icons.sh](scripts/generate-icons.sh) runs `sips` (macOS) to rasterize `public/logo.pdf` into `src/app/icon.png` and `src/app/apple-icon.png`. If `public/logo.svg` exists it is preferred for in-app rendering (sharper); otherwise the script generates a PNG fallback at `public/logo.png`. The header img tag falls back from SVG to PNG on load error — see [header.tsx:44-45](src/components/header.tsx#L44-L45).

---

## 13. Build and dev environment

**Scripts** ([package.json:5-12](package.json#L5-L12)):

```json
"dev": "next dev",
"dev:clean": "rm -rf .next/dev && next dev",
"build": "next build",
"start": "next start",
"lint": "eslint",
"postinstall": "patch-package"
```

**`dev` vs `dev:clean`.** Normal use: `npm run dev`. The Turbopack FS cache (default in Next 16) keeps chunk hashes stable across restarts and is required for startup — if `.next/dev/` is missing key manifests on first request, the server returns 500s. `dev:clean` exists as an escape hatch: if you ever hit MODULE_NOT_FOUND for chunk files mid-session (stale compiled output referencing chunks from a previous session), run it once to clear `.next/dev`, then go back to `npm run dev`.

**The patch.** [patches/next+16.2.6.patch](patches/next+16.2.6.patch) adds one `mkdirSync(dirname(tempPath), { recursive: true })` call before the atomic file write in `next/dist/lib/fs/write-atomic.js`. This fixes an ENOENT race during Turbopack's `_buildManifest` writes. The patch is reapplied automatically via `patch-package` in `postinstall`.

**If dev mysteriously starts returning 500s on every request** with errors like "Persisting failed: Unable to write SST file" or "Cannot find module '.next/dev/server/middleware-manifest.json'", the `node_modules` install is corrupt. Fix: `rm -rf node_modules .next && npm install`. This re-runs `postinstall` so the patch is reapplied.

**Known Turbopack quirk (dev only).** Turbopack compiles routes lazily — the first request to a route after `npm run dev` starts hits a ~800 ms compile window. Subsequent requests are fast. Production builds (`next build`) have no lazy compilation.

**TypeScript:** strict, `target: ES2017`, `moduleResolution: bundler`, `@/*` aliased to `./src/*`. See [tsconfig.json](tsconfig.json).

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are read in [src/lib/supabase.ts](src/lib/supabase.ts) and [src/proxy.ts](src/proxy.ts). They are public — RLS does the heavy lifting on the database side.

---

## 14. Deployment

- **Host:** Netlify, custom domain `thelogbook.studio`.
- **Env vars** are set in the Netlify dashboard.
- **Magic-link origin.** Netlify proxies set the request `host` header to an internal deploy URL, so [actions.ts:64](src/lib/actions.ts#L64) reads `x-forwarded-host` first. If the custom domain is later changed, the fallback string at the end of that same line should be updated.
- **Supabase dashboard** must be configured per §5: Site URL, Redirect URLs, and email template using `{{ .ConfirmationURL }}` pointing to `/auth/callback`.

---

## 15. Notes and known gotchas

- **Netlify deploys are budget-limited** on the free tier. Verify Supabase settings and run a local production preview (`next build && next start`) before deploying.
- **iPhone email-app webview** can't share cookies with Safari. That is the reason the auth callback handles `token_hash` (OTP) in addition to `code` (PKCE).
- **`delete_account` Postgres function** is created in `schema.sql`. If table names change, that function must be updated in the database — `schema.sql` is the source of truth but it is not auto-applied; changes must be run by hand in the Supabase SQL editor.
- **Timezone hazard.** Anywhere a date is formatted or parsed, use the helpers in [src/lib/week.ts](src/lib/week.ts), not `toISOString()`. The header streak and dashboard month calendar both depend on local-TZ dates.
- **No tests.** There is no automated test suite. Verification is manual: run `npm run dev`, click through `/dashboard`, `/log`, `/week`, `/settings`.
- **`_prototype/`** at the project root is an archived Streamlit prototype, kept for reference. Ignore it when reading the codebase.

---

*This file is hand-written and will drift as the code changes. When in doubt, the code is the source of truth — file paths above are stable but line numbers may have moved.*
