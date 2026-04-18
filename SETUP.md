# Setup Guide

Step-by-step instructions for getting Tater Tot Brain Gym running on your
desktop. These are written assuming you have basic terminal comfort but
aren't a full-time developer.

---

## 1. Prerequisites

You need two things installed on your machine:

### Node.js (version 20 or newer)

Check if you already have it:

```bash
node --version
```

If you see something like `v20.x` or `v22.x`, you're good. If not, or if
the version is older than 20, install from https://nodejs.org (pick the
LTS version).

### pnpm

```bash
node --version    # confirm Node is installed first
npm install -g pnpm
pnpm --version    # should print something like 9.x
```

If `npm install -g pnpm` fails with a permissions error on macOS or Linux,
try `sudo npm install -g pnpm` instead.

---

## 2. Get the project onto your machine

Unzip the project folder into your chosen location. The user asked for
`~/Documents/Development/Projects/`, so:

```bash
cd ~/Documents/Development/Projects/
# Unzip tater-tot-brain-gym.zip here
cd tater-tot-brain-gym
```

You should now see the project structure:

```
tater-tot-brain-gym/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── content/
├── README.md
├── SETUP.md           ← you are here
├── TEACHER-GUIDE.pdf  ← share this with your wife
└── package.json
```

---

## 3. Install dependencies

From the project root:

```bash
pnpm install
```

This takes a minute or two the first time. It installs all dependencies
for the API, the web app, and Prisma's tooling.

If you see any warnings about peer dependencies, ignore them. If you see
actual errors, the most common causes are an old Node version or network
issues (try again).

---

## 4. Set up the environment file

```bash
cp apps/api/.env.example apps/api/.env
```

The defaults are fine. You don't need to change anything unless you want
to run the API on a different port.

---

## 5. Create the database

```bash
pnpm db:migrate
```

This creates a SQLite database file at `apps/api/prisma/dev.db` and sets
up all the tables. When prompted for a migration name, you can type
something like `init` and press enter. If it doesn't prompt, that's fine
too.

---

## 6. Load the starter packs

```bash
pnpm seed
```

You'll see output like:

```
Seeding packs from .../packages/content/packs
Found 6 pack file(s)
  seeded: math-subtraction-facts (44 items)
  seeded: math-multiplication-facts (40 items)
  ...
Seed complete.
```

---

## 7. Start the app

```bash
pnpm dev
```

This starts two processes in parallel:

- The API on http://localhost:4000
- The web app on http://localhost:5173

Open http://localhost:5173 in your browser.

---

## 8. First-time admin setup

You'll see an empty home page that says "No kids set up yet."

1. Click "Go to Admin" (or scroll to the bottom and click "Adult? Admin Mode →")
2. The app will ask you to set an initial PIN. Pick something at least 4 digits. The kids shouldn't know it.
3. Once you're in, click "Kids" and then "Add kid" to create profiles for your daughter and son.
4. For each kid: set their display name (emoji is fine), their grade, and check which packs to enable.
5. After saving a kid, you can upload an avatar photo by editing them again.

---

## 9. Daily use

From then on:

```bash
cd ~/Documents/Development/Projects/tater-tot-brain-gym
pnpm dev
```

Open http://localhost:5173, kid picks their profile, click the big "Start Workout" button.

Press `Ctrl+C` in the terminal to stop the app when done.

---

## 10. Common admin tasks

```bash
# Browse the database directly (useful for troubleshooting)
pnpm db:studio

# Reset everything (WARNING: wipes all kid progress)
pnpm db:reset

# Reload starter packs (only adds new ones, doesn't overwrite edits)
pnpm seed
```

---

## Troubleshooting

### "Port 4000 is already in use"

Something else is using that port. Either close the other app, or edit
`apps/api/.env` and change `PORT=4000` to `PORT=4001`. You'll also need
to update `apps/web/vite.config.ts` to proxy to the new port.

### "Port 5173 is already in use"

Vite will automatically try 5174, 5175, etc. Just use whichever URL it
prints when starting.

### The web page loads but says "Can't reach the app"

The API isn't running. Make sure you ran `pnpm dev` (which starts both),
not just `pnpm --filter @ttbg/web dev`.

### "Module not found" errors on first run

Run `pnpm install` again. If that doesn't work, delete `node_modules`
and `pnpm-lock.yaml` at the root, then run `pnpm install`.

### Spelling bee audio doesn't play

The app uses the browser's built-in speech synthesis. Chrome and Edge
work well. Safari works but the voice may differ. Some Linux distros
need extra TTS packages installed.

### Forgot admin PIN

```bash
pnpm db:studio
```

In the browser tab that opens, click the `AppSetting` table, find the
row where `key = admin-pin`, and delete it. Refresh the Brain Gym app
and you'll be prompted to set a new PIN.

---

## Backing up

Everything important lives in two places:

1. `apps/api/prisma/dev.db` - the database (kids, packs, attempts, progress)
2. `apps/api/uploads/` - avatar photos

Copy both somewhere safe on a schedule you're comfortable with. Weekly
is plenty for a family tool.

For content-only backups, use the "Export" button on each pack in the
admin packs page. You'll get JSON files you can save anywhere.

---

## What to read next

- `README.md` for the technical architecture and design decisions
- `TEACHER-GUIDE.pdf` to share with your wife (the actual teacher)
