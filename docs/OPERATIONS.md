# Operations Guide

Everything you need to run Tater Tot Brain Gym on your Mac and reach it
from your kids' iPads, phones, and other tailnet devices.

This mirrors the pattern used for `financial-insider` so you only need
one mental model for both.

---

## How it all fits together

```
┌──────────────────────────────────────────────────────────────┐
│                          Mac                                 │
│                                                              │
│  ┌───────────────┐   ┌────────────────┐   ┌──────────────┐  │
│  │  Express API  │──▶│   SQLite DB    │   │  Tailscale   │  │
│  │  (port 4000)  │   │ apps/api/      │   │    (VPN)     │  │
│  │               │   │  prisma/dev.db │   │              │  │
│  │ serves API +  │   └────────────────┘   └──────┬───────┘  │
│  │ built web +   │                               │          │
│  │  /uploads     │                               │          │
│  └───────┬───────┘                               │          │
└──────────┼───────────────────────────────────────┼──────────┘
           │                                       │
           ▼                                       ▼
   http://<mac-name>.tail-xxxx.ts.net:4000   Private tailnet
   (only reachable from your devices)
```

Three pieces:

1. **Express API** — serves the JSON API, the built React app, and the
   uploads directory on a single port (4000).
2. **SQLite database** — one file at `apps/api/prisma/dev.db` that
   stores everything (kids, packs, attempts, review state, settings).
3. **Tailscale** — a private mesh VPN. Each of your devices gets a
   `100.x.x.x` IP and a friendly `<name>.tail-xxxx.ts.net` hostname.
   Nothing is exposed to the public internet.

The Express server is managed by **launchd** so it auto-starts at login
and auto-restarts on crash.

---

## Development vs. production

This is the most important distinction.

### Production (what runs all day, used by the kids)

- The launchd service runs the API.
- The API serves both the JSON endpoints and the pre-built React app
  from `apps/web/dist/`.
- Everyone reaches it at
  `http://<mac-name>.tail-xxxx.ts.net:4000` (or `http://100.x.x.x:4000`).
- No Vite dev server is running.

### Development (when you're working on code)

- Stop the production service.
- Run `pnpm dev` from the project root: API on 4000 (with hot reload
  via `tsx watch`), Vite on 5173 (with HMR).
- Vite proxies `/api` and `/uploads` to the API automatically.
- You work at `http://localhost:5173` (or, if you want to test on
  another tailnet device, `http://<mac-name>.tail-xxxx.ts.net:5173`
  thanks to Vite `server.host: true`).

### Switching between them

```bash
# Stop production, work in dev
pnpm prod:stop
pnpm dev

# Done coding, push back to production
# (rebuild web if the frontend changed)
pnpm prod:deploy
```

`prod:deploy` runs `pnpm build` (web), `prisma migrate deploy` (any
schema changes), and then `prod:restart`.

**Key rule:** always rebuild the frontend before restarting prod if
you changed any frontend code. The prod server serves
`apps/web/dist/`, not your sources. `pnpm prod:deploy` handles this
for you.

---

## launchd

The plist that defines the service lives at:

```
~/Library/LaunchAgents/com.tatertot.braingym.plist
```

A template is checked into the repo at
`scripts/com.tatertot.braingym.plist`. To install:

```bash
cp scripts/com.tatertot.braingym.plist ~/Library/LaunchAgents/com.tatertot.braingym.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tatertot.braingym.plist
```

### What the plist does

- **RunAtLoad: true** — starts the API at login (or whenever the plist
  is loaded).
- **KeepAlive: true** — restarts the API automatically if it crashes.
- **EnvironmentVariables** — `NODE_ENV=production`, `PORT=4000`,
  `HOST=0.0.0.0` so the API accepts tailnet connections.
- **ProgramArguments** — sources nvm, cds into `apps/api`, runs
  `node --import tsx src/index.ts` (no separate build step needed).
- **StandardOutPath / StandardErrorPath** —
  `/tmp/tatertot-braingym.log` and `/tmp/tatertot-braingym-error.log`.

### Common commands

```bash
# Wrappers (use these day-to-day)
pnpm prod:start
pnpm prod:stop
pnpm prod:restart
pnpm prod:status
pnpm prod:logs       # tails stdout
pnpm prod:errors     # tails stderr
pnpm prod:deploy     # build + migrate + restart

# Raw equivalents if you need them
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tatertot.braingym.plist
launchctl bootout   gui/$(id -u) ~/Library/LaunchAgents/com.tatertot.braingym.plist
launchctl list | grep com.tatertot.braingym
cat /tmp/tatertot-braingym.log
cat /tmp/tatertot-braingym-error.log
```

### If the service won't start

1. **Port in use.** Something else is on 4000:
   `lsof -ti:4000 | xargs kill -9`.
2. **nvm path wrong.** Confirm `echo $NVM_DIR` matches what the plist
   sources. The default `~/.nvm/nvm.sh` works for Homebrew/standard nvm
   installs.
3. **Node version drift.** If you switch Node versions via nvm, restart
   the service: `pnpm prod:restart`.
4. **Plist syntax error.** Validate:
   `plutil ~/Library/LaunchAgents/com.tatertot.braingym.plist`.

### Editing the plist later

If you move the project, change the port, or change Node setup, edit
`scripts/com.tatertot.braingym.plist`, copy it back into
`~/Library/LaunchAgents/`, then:

```bash
pnpm prod:restart
```

---

## Tailscale

### How it works

Tailscale is a private mesh VPN. Every device that signs in gets a
`100.x.x.x` IP plus a stable MagicDNS name like
`<host>.tail-xxxx.ts.net`. Devices reach each other directly over the
tailnet; nothing is exposed publicly.

### Find this Mac's tailnet address

```bash
tailscale ip -4         # 100.x.x.x
tailscale status        # full device list
hostname                # local hostname (matches MagicDNS prefix)
```

The MagicDNS name and 100.x IP are stable — they only change if you
remove and re-add this device in the Tailscale admin.

### Add a device for the kids

1. Install Tailscale on the device:
   - iOS / iPadOS: App Store → Tailscale.
   - Android: Play Store → Tailscale.
   - Mac: `brew install --cask tailscale` or App Store.
2. Sign in with your Tailscale account (or an invited user).
3. Open `http://<mac-name>.tail-xxxx.ts.net:4000` in the device's
   browser. Bookmark / Add to Home Screen.

### Adding your wife

Two options:

- **Same account.** She signs in on her devices with shared
  credentials. Simplest.
- **Separate user.** In the Tailscale admin → Users → Invite. She gets
  her own login. Cleaner audit trail, same end result.

### Admin

Manage devices, ACLs, and users at
[https://login.tailscale.com/admin](https://login.tailscale.com/admin).

### If a device can't reach the app

1. Tailscale active on both ends? Menu bar / phone toggle.
2. `ping <mac-name>.tail-xxxx.ts.net` from the device.
3. `curl http://<mac-name>.tail-xxxx.ts.net:4000/health` — should
   return `{"ok":true,...}`.
4. If `/health` doesn't respond, check `pnpm prod:status` and
   `pnpm prod:errors`.

---

## Database

### Where it lives

```
apps/api/prisma/dev.db
```

That single file is the entire database. Avatar photos live alongside
in `apps/api/uploads/`.

### Backups

```bash
pnpm db:backup
# → backups/dev-YYYYMMDD-HHMMSS.db
```

The `backups/` directory is gitignored. For a complete backup, also
copy `apps/api/uploads/`:

```bash
tar czf backups/uploads-$(date +%Y%m%d).tgz apps/api/uploads
```

To automate weekly:

```bash
crontab -e
# Add (Sunday 3am):
0 3 * * 0 cd ~/Documents/development/projects/tater-tot-brain-gym && /usr/local/bin/pnpm db:backup
```

### Restoring

```bash
pnpm prod:stop
cp backups/dev-20260403-030000.db apps/api/prisma/dev.db
pnpm prod:start
```

### Schema changes

Edit `apps/api/prisma/schema.prisma`, then in dev:

```bash
pnpm db:migrate     # creates and applies a new migration
```

To roll out the migration in production:

```bash
pnpm prod:deploy
```

(`prod:deploy` runs `prisma migrate deploy` before restarting.)

---

## Updating the app

```bash
# Pull or finish your code changes, then:
pnpm prod:deploy
pnpm prod:logs       # confirm startup
```

If something looks off:

```bash
pnpm prod:errors
pnpm prod:status
```

---

## Quick reference

| Task                      | Command                                                                  |
|---------------------------|--------------------------------------------------------------------------|
| Start production          | `pnpm prod:start`                                                        |
| Stop production           | `pnpm prod:stop`                                                         |
| Restart production        | `pnpm prod:restart`                                                      |
| Deploy code changes       | `pnpm prod:deploy`                                                       |
| Check service status      | `pnpm prod:status`                                                       |
| Tail stdout               | `pnpm prod:logs`                                                         |
| Tail stderr               | `pnpm prod:errors`                                                       |
| Kill stuck process on 4000| `lsof -ti:4000 \| xargs kill -9`                                         |
| Tailscale IP              | `tailscale ip -4`                                                        |
| Tailscale status          | `tailscale status`                                                       |
| Backup DB                 | `pnpm db:backup`                                                         |
| Apply schema changes (dev)| `pnpm db:migrate`                                                        |
| Open Prisma Studio        | `pnpm db:studio`                                                         |
| Reset everything          | `pnpm db:reset` (wipes data)                                             |
| Reload starter packs      | `pnpm seed`                                                              |
