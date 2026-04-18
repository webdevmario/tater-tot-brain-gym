# Tater Tot Brain Gym

A homeschool retention training app for the Tater Tot Academy. Helps kids
retain what they've learned through short, focused review sessions with
spaced repetition.

Built for local use at a homeschool station. No accounts, no cloud, no
subscriptions. Your data stays on your machine.

---

## What it is

A "training gym" for facts and skills kids should know. Each kid picks
their profile, picks a subject, and does a 10 to 15 minute session. The
session mixes question types, tracks what they miss, and automatically
pulls missed items back in later sessions using spaced repetition.

It is not a game. It is a training tool with light game elements (XP,
streaks, weekly badges, simple ranks). The goal is retention, not
entertainment, though we want it engaging enough that kids will actually
use it.

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
- **Teach-me cards**: when a kid misses or times out on an item, a short
  card shows the answer, context, and a mnemonic if available, then
  the item requeues later in the session
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

### Daily use

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
```

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

## What's not built yet

This README describes the target architecture. Current status:

- [x] Database schema (Prisma)
- [x] Monorepo scaffolding
- [x] Seed script
- [ ] API routes (kids, packs, sessions, attempts)
- [ ] Spaced repetition algorithm implementation
- [ ] Web UI: kid picker, session player, admin mode
- [ ] Avatar upload and customization
- [ ] Starter pack content

Features will be built in that order.

---

## License and use

Private family project for the Tater Tot Academy. No license granted
for redistribution. If you're reading this and you're not family, hi,
and please don't publish starter pack content that's derived from
copyrighted curriculum materials.
