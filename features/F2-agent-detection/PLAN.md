# F2 — Agent & Eval Detection: Implementation Plan

> **For agentic workers:** Follow the [`agentgit-feature-workflow`](../../.claude/skills/agentgit-feature-workflow/SKILL.md) skill. Each **Part = one PR**. Depends on F1 (connected repo + `octokitForInstallation`).

**Goal:** Scan a connected repo's default branch, detect agent candidates and their eval commands, persist them (org-scoped), and show them on the dashboard.

**Architecture:** A pure **detection engine** (`packages/detect`, no I/O — testable against fixtures) + an API **detection module** (`apps/api/src/detect`) that reads the repo tree via the installation Octokit, runs the engine, applies `agentgit.yaml`, and persists `agents`.

**Tech stack:** TypeScript (pure heuristics) · `@octokit/rest` (tree read) · `yaml` (config) · Drizzle · ts-rest · Vitest · Playwright.

## Global constraints
Per [`../../sprints/sprint-01/PRD.md`](../../sprints/sprint-01/PRD.md). Detection is **heuristic + convention + optional `agentgit.yaml`** (yaml overrides all). Persisted `agents` are org-scoped + RLS; IDs UUIDv7.

---

## Part F2.1 — Detection engine + repo tree read (PR #1)

**Goal:** A pure function that, given a repo file tree, returns agent candidates; plus the API glue to fetch the tree.

**Files:**
- Create: `packages/detect/src/{index,agents,signals}.ts` (pure), `packages/detect/test/agents.test.ts`, `packages/detect/test/fixtures/*` (sample trees)
- Create: `apps/api/src/detect/tree.service.ts` (Octokit `GET /repos/{o}/{r}/git/trees/{sha}?recursive=1`)
- Test: `apps/api/test/tree.test.ts`

**Interfaces (produces):**
- `detectAgents(tree: {path:string}[]): AgentCandidate[]` where `AgentCandidate = { name, path, framework?, signals: string[] }`.
- Heuristics (spec §7 F2a): dirs containing `SKILL.md`; files importing `langgraph|langchain|crewai|autogen|llama_index|agno`; paths matching `agents/**`, `*.agent.py`, `agent.yaml`, `prompts/**`; group by nearest common dir.
- `TreeService.readTree(installationId, repoFullName, ref): Promise<{path:string}[]>`.

**Test cases (write first):**
- Unit (fixtures): a tree with `agents/support/SKILL.md` + `agents/support/main.py` → one candidate `support` at `agents/support` with signal `skill.md`; a `langgraph` import → framework `langgraph`; an empty repo → `[]`; two agents under `agents/*` → two candidates.
- Integration: `readTree` with mocked GitHub tree response returns flat paths.

**Steps:** write fixture-based unit tests → fail → implement `signals.ts` + `detectAgents` (pure) → pass; write `readTree` integration test (`msw`) → implement → pass. Create `packages/detect/AGENTS.md`. Commit per green step.

**Acceptance:** given a tree, detection returns correct candidates; `readTree` returns the tree. **No persistence yet.**

**PR boundary:** pure engine + tree read only.

---

## Part F2.2 — Persist agents + `agentgit.yaml` + dashboard list (PR #2)

**Goal:** Run detection on connect, apply `agentgit.yaml` overrides, persist `agents`, and list them on the dashboard.

**Files:**
- Create: `packages/db/src/schema/agents.ts` + migration (org-scoped + RLS), `apps/api/src/detect/{detect.service,detect.controller}.ts`, `apps/api/src/detect/config.ts` (`agentgit.yaml` parse), `packages/contracts/src/agents.contract.ts`
- Modify: install callback (F1.4) to trigger detection; `apps/web/app/(app)/dashboard/page.tsx` (render agents)
- Test: `apps/api/test/detect.e2e.test.ts`, `apps/web` `e2e/detect.spec.ts`

**Interfaces:**
- Consumes: `readTree`, `detectAgents` (F2.1), `getDb`, `agents`.
- Produces: `agents(id, org_id, repo_id, name, description, path, entrypoint, framework, eval_command, dataset_path, created_at)` UNIQUE `(repo_id, path)`; `DetectService.detectAndPersist(installationId, repo, orgId)`; contract `agents.list → GET /api/v1/agents`.
- `agentgit.yaml` schema (spec §6): `agents[].{name, path, entrypoint, framework, eval:{command,dataset}}` — overrides/augments detected candidates by `path`.

**Test cases (write first):**
- Unit: `agentgit.yaml` with a declared agent merges over a detected candidate at the same `path` (yaml wins on conflicts); a yaml-only agent is added.
- Integration: detect+persist upserts `agents` (org-scoped); re-run is idempotent (UNIQUE `(repo_id, path)`); cross-org isolation via `GET /api/v1/agents`.
- E2E: connect a fixture repo (mocked GitHub) → `/dashboard` shows detected agents with names/paths.

**Steps:** schema + migration → failing integration test → implement `config.ts` (yaml merge, unit-tested) + `detect.service` (readTree → detect → merge yaml → upsert) + trigger from callback → pass; contract + controller → cross-org integration → pass; dashboard render → E2E → pass. Update `data-model.md` (agents shape confirmed), worklog. Commit.

**Acceptance:** connecting a repo yields persisted, org-isolated `agents` shown on the dashboard; `agentgit.yaml` overrides detection; re-detection is idempotent.

**PR boundary:** agents + config + list — eval-command detection is F2.3.

---

## Part F2.3 — Eval command detection (PR #3)

**Goal:** Determine how to evaluate each agent and store `eval_command`.

**Files:**
- Modify: `packages/detect/src/evals.ts` (pure eval detection), `apps/api/src/detect/detect.service.ts` (populate `eval_command`)
- Test: `packages/detect/test/evals.test.ts`, `apps/api/test/detect-evals.test.ts`

**Interfaces:**
- Produces: `detectEval(tree, agentPath): { command?, tool?, datasetPath? }` — recognizes `evals/`, `**/*.eval.py`, `promptfooconfig.yaml`, imports of `deepeval|ragas|inspect_ai`, and `package.json`/`Makefile`/`pyproject.toml` scripts named like `eval`; `agentgit.yaml eval.command` wins.

**Test cases (write first):**
- Unit (fixtures): `promptfooconfig.yaml` next to an agent → tool `promptfoo` + a command; an `evals/` dir with `*_eval.py` → a pytest-style command; nothing found → `{}` (offer dataset builder later — out of scope); `agentgit.yaml eval.command` overrides all.
- Integration: after detect+persist, agents have the expected `eval_command`.

**Steps:** write fixture unit tests → fail → implement `evals.ts` → pass; wire into `detect.service` → integration → pass. Note "no evals found" degrades gracefully (F9 dataset builder handles it later). Worklog; commit.

**Acceptance:** for repos using a common eval tool or `agentgit.yaml`, each agent's `eval_command` is detected and stored.

**PR boundary:** eval detection only.

---

## Self-review
- **Spec coverage (F2):** agent detection heuristics (F2.1), yaml override + persist + confirm (F2.2), eval-script/command detection (F2.3). "No evals" path noted as deferred to F9. ✅
- **Type consistency:** `detectAgents`, `readTree`, `detectEval`, `detectAndPersist`, `agents` columns consistent across parts and with F1's `repos`/`getDb`.
