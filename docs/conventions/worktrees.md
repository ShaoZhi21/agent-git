# Worktrees & Parallel Agents

How we run multiple agents on AgentGit at once without stepping on each other.

## The model

- **Claude = orchestrator** (this main checkout, `~/github/agentgit`). Plans sprints/PRDs, reviews PRs, merges to `main`, keeps everyone in sync.
- **Codex subagents = implementers**, each in its own **git worktree** on its own branch, working **one PR at a time** from the feature `PLAN.md`.

All worktrees share the same `.git` (one repo, one history) but have independent working directories, branches, and `node_modules`.

## Layout

Sibling directory (matches the repo's house convention, e.g. `weavo-worktrees`):
```
~/github/agentgit                 ← main (orchestrator)
~/github/agentgit-worktrees/
  ├── <branch-a>/                 ← codex agent A
  └── <branch-b>/                 ← codex agent B
```

## Rules

1. **One branch per PR**, named for the PLAN part (e.g. `sprint01/f1-db-foundations`).
2. Every worktree follows the [`agentgit-feature-workflow`](../../.claude/skills/agentgit-feature-workflow/SKILL.md) skill — tests first, unit→E2E, docs updated, small PR.
3. **Parallelize on independent work.** Two agents must not edit the same files. Good parallel pairs: F1.1 (DB, `packages/db`) ∥ F2.1 (detection engine, `packages/detect`) — no shared files. Sequential chains (F1.1→F1.2→…) stay in one worktree.
4. The **sprint PRD + PLANs on `main`** are the shared source of truth. Rebase worktrees on `main` before starting a PR and after each merge.
5. Merge to `main` only via a reviewed PR that meets the Definition of Done.

## Commands

```bash
# create (from repo root, up-to-date main)
git worktree add ../agentgit-worktrees/<branch> -b <branch>
cd ../agentgit-worktrees/<branch> && pnpm install   # each worktree needs its own install

git worktree list                 # see all worktrees
git worktree remove ../agentgit-worktrees/<branch>   # clean up when merged
```

Each worktree runs its own `pnpm dev:infra` is **not** needed twice — Postgres/NATS are shared on `localhost`; run one infra stack and have both apps point at it (mind port conflicts: run only one `apps/api`/`apps/web` at a time, or override `PORT`/`NEXT_PUBLIC_API_URL` per worktree).
