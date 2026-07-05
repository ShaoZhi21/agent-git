# AGENTS.md

**Canonical operating manual for any AI agent working in this repository.** Read this first, every session, before doing anything else. (Tool-specific files like `CLAUDE.md` defer to this one.)

---

## 1. What this project is

**AgentGit** (working name — "GitHub for AI agents") — the system of record for a company's AI agents. Connect a repo (no rewrite), snapshot each agent as a **Checkpoint** on every change, evaluate it, and flag + diagnose regressions. See [`README.md`](README.md) for the pitch, [`docs/spec.md`](docs/spec.md) for the full spec.

**Status:** early. Foundations and architecture are locked; implementation is starting. Follow the build order in spec §10.

## 2. The one mental model

Everything is built on the **Checkpoint** — an immutable snapshot of an agent at a commit (prompt + skills + tools + code) **plus its measured quality** (eval result + cost). Every feature is one of: *produce* a checkpoint, *evaluate* one, *compare* two, or *reason about the delta*. If a change doesn't touch a checkpoint, question whether it belongs (spec §2.2, §8).

---

## 3. The agent working loop ⭐

Work is tracked at **four levels**. You **read down** this stack for context before coding, and **write back up** after. This is how context persists across sessions and agents — treat the docs as shared memory.

| Level | Where | You read it to… | You write it to… |
|---|---|---|---|
| **Sprint** | `sprints/sprint-NN/` | know what's in scope *now* | tick status, add a retro when it closes |
| **Feature** | `features/F<n>-<name>/` | get the spec, plan, and history for one feature | log your plan (before) + what changed (after) — your main surface |
| **Folder** | `<code-dir>/AGENTS.md` | understand a module's role, patterns, entry points | update it when you change the folder's shape |
| **PR** | `.github/pull_request_template.md` | — | summarize the change + tick the docs-updated checklist |

### Every task follows this loop

1. **Orient (READ):** this file → the current `sprints/` sprint → the feature's `README.md` → the relevant `docs/conventions/*` → the target folder's `AGENTS.md`.
2. **Plan (WRITE, before coding):** in the feature's **Worklog**, note what you're about to do and which packages/files you'll touch. Check scope against spec §8 (non-goals).
3. **Implement:** follow the conventions exactly; stay inside the feature's scope.
4. **Record (WRITE, after coding):**
   - **Feature Worklog** — what changed, key decisions, follow-ups, new status.
   - **Folder `AGENTS.md`** — update if you changed its structure, entry points, or patterns.
   - **`changes/`** — add a dated ADR if you made a real decision or deviated from the spec/conventions.
   - **`docs/`** — update spec/architecture/conventions if behavior or a rule changed.
   - **Sprint** — update the feature's status; add a retro note if it closed.
   - **PR** — fill the template, including the docs-updated checklist.
5. **Verify before "done":** exercise the change against the feature's **acceptance criteria** (from spec §7). Never claim done on unrun code.

> **Rule of thumb: read before, write after — always.** If you learned something or changed a shape, a doc changes *in the same PR*. Stale docs are worse than none in an AI-native repo — agents trust them.

---

## 4. Where things live (repo map)

**Docs & knowledge**
| Path | What |
|---|---|
| `docs/spec.md` | Full technical specification — the source of truth. |
| `docs/decisions.md` | Status index of heavy one-way-door decisions. |
| `docs/conventions/` | **How we build** — data-model, api-and-versioning, events, auth, security. Read the relevant one before coding in that area. |
| `docs/architecture.md` · `docs/glossary.md` | System shape · domain vocabulary. |
| `changes/` | Dated decision records (ADRs). |

**Work tracking** (§3)
| Path | What |
|---|---|
| `sprints/` | Sprint plans + retros. |
| `features/` | One folder per feature (`F<n>-<name>/`) with spec + plan + worklog. |
| `.github/pull_request_template.md` | Per-PR summary + docs checklist. |

**Code** (each folder has its own `AGENTS.md`)
```
apps/web         Next.js frontend
apps/api         NestJS + Fastify (control plane)
packages/db      Drizzle schema + migrations (RLS)
packages/contracts  agentgit-json + public API schemas (versioned)
packages/events  CloudEvents envelope + event schemas (versioned)
packages/auth    identity boundary + authorize() layer
packages/config  shared tsconfig / lint / format
services/eval-sandbox   Python (FastAPI) — Mode B hosted evals (added later)
```

## 5. Locked stack & decisions

TypeScript end-to-end across the web tier. **NestJS + Fastify** API · **Next.js** frontend · **Drizzle + Postgres** (RLS) · **NATS JetStream** (event bus + queue) · **Octokit** · **Anthropic (Claude)** · **Python/FastAPI** eval sandbox (Mode B). All decisions and rationale: [`docs/decisions.md`](docs/decisions.md) + [`changes/`](changes/). Don't re-litigate a locked decision without a new ADR.

## 6. Conventions & guardrails

- **Naming:** product = AgentGit. Core object = **Checkpoint**. Users = **Builder** / **Consumer**. Defined in `docs/glossary.md`.
- **Open-core & self-hostable (locked):** OSS core = **Apache-2.0**, self-hostable. Core-path deps must be **permissive-OSS** (MIT/Apache/BSD/ISC) — no managed-only services, no AGPL/SSPL/BSL in the core. Team/enterprise features are commercial.
- **Phasing:** don't build Phase 2/3 features while Phase 1 is unvalidated (spec §1.4). Rule: *attribute of a checkpoint → early; a system you'd operate → late or out.*
- **Secrets:** never commit keys. BYOK keys encrypted at rest, decrypted only in the sandbox (see `docs/conventions/security.md`).
- **Commits/PRs:** clean messages authored by the user. **Never** add AI/Claude co-author or "Generated with" trailers.

## 7. What NOT to build (spec §8)

Auto-fix / code-modifying agent · inference hosting/routing/gateway · fine-tuning · a deploy system (at most open a PR) · a general observability/logging platform · a framework for authoring agents. **AgentGit is an overlay, never a framework.**

## 8. Build order (spec §10, condensed)

1. Auth + GitHub App skeleton (F1) → 2. Repo read + detection (F2) → 3. Checkpoint on push (F3) → 4. Eval runner Mode A (F4) → 5. Timeline UI (F5) → 6. Regression detection + PR comment (F6) → 7. Diagnosis agent (F8) → 8. Behavioral diff + rewind (F7) → 9. Dataset builder + hosted runner (F9, F4 Mode B).

**Steps 1–7 are the smallest lovable demo:** connect → quality timeline → catch a regression on a PR → get told why.

## 9. Golden rules

1. Read before, write after — always (§3).
2. The spec and conventions win; deviate only with a recorded ADR.
3. Stay in the feature's scope; check §8 non-goals.
4. Keep TypeScript end-to-end; Python only in the eval sandbox.
5. Verify against acceptance criteria before claiming done.
6. Prefer robust **open-source**, self-hostable building blocks for anything new.
