# Local Development & Packaging

How to run AgentGit locally with **live reload**, and how we package it. TL;DR: **Docker for infra, native for the apps.**

## First-time setup
```bash
cp .env.example .env      # fill in as features need them
pnpm install
pnpm dev:infra            # Postgres + NATS via Docker Compose (needs Docker running)
pnpm dev                  # web + api + libs, all in watch mode
```

## The two commands

| Command | What it runs | Notes |
|---|---|---|
| `pnpm dev:infra` | `docker compose up -d` → **Postgres + NATS** | Stateful infra only. `dev:infra:down` / `dev:infra:logs` too. |
| `pnpm dev` | `turbo run dev` → **all apps + libs in watch** | api `nest start --watch` · web `next dev` (HMR) · libs `tsc --watch`. |

## Live reload — how it works

`pnpm dev` uses **Turborepo** to run every package's `dev` script concurrently:
- **api** — `nest start --watch` rebuilds + restarts on change.
- **web** — `next dev` hot-module-reloads instantly.
- **shared libs** (`contracts`, `db`, `events`, `auth`) — `tsc --watch` recompiles `dist` on change.

Cold start is correct because the `dev` task `dependsOn: ["^build"]` — Turbo builds the libs once before starting the watchers, so the API has `dist` to import. Editing a shared lib triggers its `tsc --watch` rebuild; if a consuming app doesn't hot-pick-up the change, restart that app.

## Packaging strategy (the evaluation)

**Dev = Docker for infra, native for apps.** Containerize only the stateful services you don't want to install locally (Postgres, NATS); run the Node apps natively. Native watchers (Next HMR, `nest --watch`) are **much faster** than container file-sync, and you keep a tight edit→reload loop.

- **Turborepo `dev`, not `concurrently`.** We already have Turbo; `turbo dev` is graph-aware (respects build order), cached, and runs all `dev` scripts in parallel. It supersedes `concurrently` (which just runs N commands) — don't add `concurrently`.
- **Full-container dev (`docker compose watch`)** is possible but slower for a TS monorepo (sync + in-container rebuild). Not recommended for day-to-day dev.
- **Deployment / self-host (G1)** is where containers earn their place: multi-stage **Dockerfiles per app** (`api`, `web`) + the Python **eval-sandbox** image (Mode B), orchestrated with Compose/Helm. Built at deploy time. Because the core deps are permissive-OSS ([open-core ADR](../../changes/2026-07-06-open-core-self-host.md)), the images are self-hostable.

## Postgres & RLS (important)

The Compose superuser (`agentgit`) is for **migrations**. The app runtime must connect as a **non-superuser app role** so Postgres RLS actually applies (superusers bypass it) — see [`data-model.md`](data-model.md). That role is created by migrations at build step 1 (F1).

## Ports
| Service | Port |
|---|---|
| api | 3001 |
| web | 3000 (Next default) |
| Postgres | 5432 |
| NATS client / monitor | 4222 / 8222 |
