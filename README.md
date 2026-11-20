# Tater Tot Brain Gym

A homeschool retention training app for the Tater Tot Academy. Helps kids
retain what they've learned through short, focused review sessions with
spaced repetition.

Built for local use at a homeschool station. No accounts, no cloud, no
subscriptions. Your data stays on your machine.

---

## What it is

A "training gym" for facts and skills kids should know. Each kid picks
their profile and does a short workout: a fixed round of questions
(10 by default), either mixed from all their packs or focused on one.
Missed items get a "let's learn it" card, come back later in the round,
and keep coming back in future workouts via spaced repetition.

**No timers anywhere.** There is no countdown, no speed scoring, and
nothing to lose. Slow-and-right is right.

It is not a game, but it borrows what makes good learning apps sticky:

- **Lesson loop (Duolingo-style):** fixed-length rounds with a progress
  bar, instant feedback, and a celebration screen at the end.
- **XP and ranks:** 10 XP per correct answer, 2 XP for a wrong one
  (trying counts), bonuses for finishing and for perfect rounds. XP
  climbs a 10-step potato rank ladder (Seedling → Golden Spud, then
  prestige stars).
- **Weekly goal ring (Apple Fitness-style):** per-kid workouts-per-week
  goal, plus a day streak that never shames when it resets.
- **Trophies:** ~25 badges for workouts, facts learned and mastered,
  streaks, perfect rounds, and "bouncing back" on missed facts. Locked
  ones show progress so there is always a next thing to aim for.

## Who it's for

- Kids working through any homeschool curriculum (currently designed
  around Abeka and Classical Conversations, but subject-agnostic)
- Parents and teachers who want to reinforce fundamentals and spot gaps

## Feature overview

- **Kid profiles** with avatars (upload a photo, apply simple filters/stickers)
- **Pack-based content**: enable/disable topic groups per kid
- **Multiple question types**: multiple choice, type-the-answer, spelling
  bee (browser text-to-speech), math drill, matching
- **Spaced repetition**: items you miss come back; items you master
  space out until they're retired from active review
- **Teach-me cards**: when a kid misses an item, a short card shows the
  answer, context, and a mnemonic if available, then the item requeues
  later in the session
- **iPad-first**: installable to the Home Screen (PWA), big touch
  targets, an on-screen number pad for math, and read-aloud buttons
- **Kid customization**: each kid picks a color theme, emoji avatar, and
  a title from their earned trophies. Six colors are free; eight more
  unlock with ranks (Galaxy, Neon, Lava, Gold…)
- **Mac voice**: spelling words ("word, sentence, word") and read-aloud
  questions are spoken by the host Mac's `say` voice and cached, so
  every iPad sounds the same. Pick the voice in admin Settings; a free
  Premium voice (System Settings → Accessibility → Spoken Content →
  Manage Voices) makes a big difference
- **Per-grade item tagging**: each item is tagged by grade level
  independent of its pack, so a kid set to grade 3 sees mostly grade 3
  items with grade 2 mixed in for review
- **Admin mode** (PIN-gated) for managing kids, packs, and progress
- **Progress dashboard** per kid: accuracy, session history, struggling
  items, mastery by subject and grade
- **Import/export packs** as JSON for backup or sharing

---

## Architecture

### Monorepo structure

```
tater-tot-brain-gym/
├── apps/
│   ├── api/                   # Express + Prisma + SQLite
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── index.ts       # Express entry point
│   │       ├── seed.ts        # One-time pack seeding
│   │       └── routes/        # API endpoints (built incrementally)
│   └── web/                   # Vite + React frontend
│       └── src/
├── packages/
│   └── content/
│       └── packs/             # Seed JSON pack files
├── package.json               # Workspace root
├── pnpm-workspace.yaml
└── README.md                  # This file
```

### Tech stack

- **Package manager**: pnpm (workspaces)
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + React Router
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite via Prisma
- **File storage**: local filesystem (`apps/api/uploads/`) for avatar photos

### Why this stack

- **Vite over Next.js**: simpler dev experience, no framework magic, fast
  rebuilds. The user asked for it and it fits a local-only app well.
- **Express over Fastify/Hono**: most familiar, most documented, good
  enough for a single-user local app.
- **SQLite over Postgres**: one file, no server, trivial backups. This
  app will never need concurrent writes from more than a few people on
  a LAN.
- **Prisma over Drizzle/Kysely**: best developer experience for a
  schema-driven app, great migration tooling, clear model definitions.
- **No auth library**: profiles are just data. Admin access is a single
  shared PIN stored in the DB. Deliberately simple for a family tool.

---

## Data model (decisions)

### Packs: database is source of truth

Packs are created, edited, and managed through the admin UI. The
database is where they live.

The JSON files in `packages/content/packs/` are seed data. They're
loaded once via `pnpm seed` on first setup. After seeding, those files
are not consulted. Re-running `pnpm seed` only inserts packs that don't
already exist in the DB (it does not overwrite edits).

To share packs between installs or back them up, use the admin UI's
JSON import/export.

### Items have stable IDs

Every item (question) has an `id` assigned in the pack definition, not
auto-generated. This means when a pack is edited, attempt history and
spaced repetition state for each kid survive. Never reassign item IDs.

### Grade is one field per kid

Each `Kid` has a single `grade` field (e.g. 3). The session engine
pulls items where `item.gradeLevel <= kid.grade`, weighted toward the
kid's exact grade. A 3rd grader gets mostly grade 3 items with some
grade 2 mixed in for review. If you want to challenge them, bump the
grade field by 1.

Items carry their own `gradeLevel` independent of the pack, which is
what enables per-grade progress reporting.

### Spaced repetition: simplified SM-2

One `ReviewState` row per (kid, item). After each attempt:

- Correct answer: interval grows, next review scheduled further out
- Wrong answer: interval resets, item requeues later in same session
  (via `intervalDays < 1`), then in the next session, then a few days out
- After enough successful reviews, items are flagged as mastered and
  drop out of active rotation (admin can unmaster if needed)

The exact algorithm is implemented in the session engine (not yet
built). It's SM-2 style: ease factor, repetition count, interval.
Simpler than Anki's full SM-2, sufficient for our needs.

### Attempts are immutable history

Every question answered is logged as an `Attempt` row. This is what
powers progress dashboards and lets the spaced repetition algorithm
make decisions. They're cheap in SQLite; we don't prune them.

---

## Content sourcing (important)

The app will ship with starter packs for generic grade-level content:
math facts, synonyms/antonyms/homonyms, US geography, science basics,
common spelling patterns.

These starter packs are generated from general grade-level expectations
drawing on sources like Common Core standards (for math and language
arts grade-level targeting), Dolch/Fry sight word lists, and widely
accepted geography and science curricula. Each pack includes a `source`
field indicating what it was based on.

**Starter packs should be reviewed by a teacher before use.** Grade
tagging is based on typical expectations and may not match every
family's pacing or curriculum. The admin UI makes per-item editing easy.

**Curriculum-specific content (Abeka spelling lists, CC memory work,
Latin, timeline, science memory work, etc.) is not included.** That
content is copyrighted by its publishers. It must be authored through
the admin UI from your curriculum materials. CSV paste and bulk import
make this manageable.

See `TEACHER-GUIDE.pdf` (generated separately) for a non-technical
walkthrough aimed at whoever actually teaches the kids.

---

## Running the app

### First-time setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp apps/api/.env.example apps/api/.env

# Create the database
pnpm db:migrate

# Load starter packs
pnpm seed

# Start both frontend and backend in parallel
pnpm dev
```

The API runs on http://localhost:4000 and the web app on http://localhost:5173.

### Daily use (development)

```bash
pnpm dev
```

### Common admin tasks

```bash
# Open Prisma Studio to inspect the DB directly
pnpm db:studio

# Reset everything (WARNING: wipes all data)
pnpm db:reset

# Reload new seed packs (existing packs are not overwritten)
pnpm seed

# Snapshot the database into ./backups/
pnpm db:backup
```

---

## Production (always-on, reachable from kid devices)

Brain Gym is meant to live on one Mac and be reachable from your
family's iPads, phones, and laptops over Tailscale. The setup mirrors
`financial-insider`:

- The Express API runs under launchd, auto-starting on login and
  auto-restarting on crash.
- The API serves the built React app and `/uploads` from a single port
  (4000), so there is one URL to remember.
- All access is over Tailscale — nothing is exposed to the public
  internet.

### One-time install

```bash
# Build the frontend
pnpm build

# Install the launchd plist
cp scripts/com.tatertot.braingym.plist ~/Library/LaunchAgents/com.tatertot.braingym.plist

# Start the service
pnpm prod:start
pnpm prod:status      # confirm it's running
pnpm prod:logs        # tail startup output
```

### Tailscale

```bash
# On the Mac
brew install --cask tailscale       # if not already
tailscale up
tailscale status                    # see all your devices
hostname                            # this Mac's MagicDNS prefix
```

On each kid's device:

1. Install Tailscale (App Store on iOS/iPadOS, Play Store on Android).
2. Sign in with the same Tailscale account (or accept an invite).
3. Open the Brain Gym address in Safari and tap Share → "Add to Home
   Screen". For the full app experience (instant launch, offline shell)
   serve it over HTTPS with `tailscale serve --bg 4000`; see
   [docs/OPERATIONS.md](docs/OPERATIONS.md#https-for-the-ipad-app-recommended).

### Day-to-day production commands

```bash
pnpm prod:deploy      # build + migrate + restart (use after code changes)
pnpm prod:restart     # restart without rebuilding
pnpm prod:stop        # stop, e.g. before doing dev work
pnpm prod:logs        # tail stdout
pnpm prod:errors      # tail stderr
```

Full operations runbook: [docs/OPERATIONS.md](docs/OPERATIONS.md).

---

## Backing up

The entire app state lives in two places:

1. `apps/api/prisma/dev.db` (the SQLite database: kids, packs, attempts,
   review state, badges, settings)
2. `apps/api/uploads/` (avatar photos)

To back up: copy both somewhere safe. To restore: replace them.

For finer-grained backup of just content, use the admin UI's pack
export to save JSON files.

---

## Admin PIN

On first launch, the admin UI prompts for a PIN. This is stored hashed
in the `AppSetting` table under the key `admin-pin`. To change it, use
the admin UI's settings page. To reset if forgotten, delete the
`admin-pin` row via `pnpm db:studio` and you'll be prompted to set a
new one.

This is not real authentication. It is enough friction to stop a 7
year old from wandering into admin. It is not enough to stop a
determined adversary, and nothing in this app assumes it is.

---

## Status

Working end to end: kid profiles, admin (packs, kids, progress), the
session engine with spaced repetition, four question types (multiple
choice, type-the-answer, spelling bee, math drill), progression (XP,
ranks, streaks, weekly goal, trophies), and PWA install.

Not built yet: the "matching" question type, avatar filters/stickers.

---

## License and use

Private family project for the Tater Tot Academy. No license granted
for redistribution. If you're reading this and you're not family, hi,
and please don't publish starter pack content that's derived from
copyrighted curriculum materials.
