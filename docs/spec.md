<!--
  SOURCE OF REFERENCE — do not casually edit.
  This is the canonical technical specification for the project. Working name: AgentGit
  (a placeholder — "GitHub for AI agents"). The name is expected to change; when it does,
  rename this file's references and the repo together.
  All design decisions, data models, and build order flow from this file.
  Amendments should be recorded in /changes and, if they alter intent here, folded back in.
-->

# AgentGit — Technical Specification

> **Working name:** AgentGit (placeholder, generic — "GitHub for AI agents"; the product *is* the map of a company's agents). Expected to change.
> **Document purpose:** This is an implementation-oriented technical spec written to be handed to a coding agent (Claude Code). It explains the problem, the roadmap and reasoning, and each feature with concrete technical detail (data models, flows, API shapes, detection heuristics). Read it top to bottom once before writing code. Build order is in §10.
> **Status of the idea:** The core wedge (Phase 1) is a strong, reasoned hypothesis that has **not yet been validated with real users**. Build Phase 1 as a thin, testable slice. Do not build Phase 2/3 until Phase 1's core assumption (below) is confirmed. This is called out again in §4 and §10.

---

## 1. Problem & Context

### 1.1 The situation
Companies are shipping AI agents (LLM-powered systems that answer questions, call tools, run multi-step tasks) faster than they can manage them. Empirically, a single large org can already run ~100 distinct agents across teams — overlapping, siloed, with no shared record of what exists, what each costs, or whether any still works. The count is compounding across the industry, and most agent projects fail on the **operational layer** (versioning, evaluation, observability, governance) rather than on model quality.

### 1.2 Two distinct users with two distinct pains

**The Builder** (develops agents): When they change an agent's prompt / skills / tools / logic, they have no reliable way to know they didn't make it *worse*. Agents regress silently; the builder often finds out from a user or notices late. There is no "did this change hurt quality" gate, no clean version history that ties a version to its measured quality, and no fast way to diagnose *why* a regression happened.

**The Consumer** (uses agents others built): They can't discover, trust, or reuse agents other teams already built. They don't know what exists, how to call it, whether it's reliable, or who owns it — so they rebuild things that already exist.

### 1.3 The core insight
No product owns the **record of what every agent is and whether it works**. If you own that record — call it *the map* — then governance, cost tracking, discovery, and orchestration all have to plug into you. AgentGit is not a feature tool; it is the graph the rest of the category depends on.

### 1.4 The single riskiest assumption (validate before over-building)
> **Builders feel "my agent silently got worse" as a real, painful, recurring wound — not a shrug.**

If true, Phase 1 lands and the whole arc follows. If false, re-aim. Phase 0 (a validation survey/interviews, out of scope for this code spec) exists to answer this. This spec assumes it is being validated in parallel.

---

## 2. Product Overview & Core Primitive

### 2.1 What AgentGit does (one sentence)
AgentGit connects to the agents a team already has (no rewrite), versions each agent as a unified bundle, runs evaluations on every change, flags and diagnoses regressions, and — over time — becomes the searchable map of every agent a company runs and whether it works.

### 2.2 The core primitive: the **Agent Checkpoint**
Everything in AgentGit is built around one object. A **Checkpoint** is an immutable snapshot of an agent at a point in time, capturing *everything* that defines its behavior plus its measured quality:

```
Checkpoint = {
  agent_id,
  git_commit_sha,          // the commit this checkpoint corresponds to
  prompt_versions,         // hashes/content of prompt files at this commit
  skills,                  // SKILL.md files + versions referenced
  tools,                   // tool/function definitions + schemas + versions
  code_ref,                // entrypoint file + relevant source refs
  eval_result,             // score(s) + per-case results (see §6)
  cost,                    // token + $ cost per eval run (if available)
  deploy_status,           // is this the version currently live? (read-only)
  created_at
}
```

Every feature is one of: **producing** a checkpoint, **evaluating** one, **comparing** two, or **reasoning about the delta** between two. This is the mental model to keep while building. If a proposed feature does not touch a checkpoint, it is probably out of scope (see §7 "non-goals").

### 2.3 The two surfaces of the map
- **Builder surface (Phase 1–2):** create, evaluate, diff, diagnose checkpoints. This *populates* the map.
- **Consumer surface (Phase 3):** browse the map — discover agents, see health/eval status, learn how to use them. This is a *view* on the same data the builder surface produced.

The consumer surface is cheap to build *only after* the builder surface has populated the registry. Do not invert this order.

---

## 3. High-Level System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              AgentGit Web App                │
                    │  (Next.js: dashboard + API routes)        │
                    │  - GitHub App install/callback            │
                    │  - Checkpoint timeline UI                 │
                    │  - Regression + diff views                │
                    │  - Diagnosis output                       │
                    └───────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐        ┌─────────▼─────────┐        ┌────────▼────────┐
│  GitHub App     │        │   Postgres DB      │        │  Eval Runner     │
│  integration    │        │  (checkpoints,     │        │  - Mode A: GH    │
│  (Octokit)      │        │   agents, evals,   │        │    Action        │
│  - webhooks     │        │   installs, orgs)  │        │  - Mode B: hosted│
│  - repo read    │        │  + object store    │        │    sandbox       │
│  - PR comments  │        │   for traces       │        │    (Python)      │
└─────────────────┘        └────────────────────┘        └──────┬──────────┘
                                                                 │
                                                         ┌───────▼────────┐
                                                         │  Diagnosis      │
                                                         │  Agent (LLM)    │
                                                         │  reasons over   │
                                                         │  diff+delta+    │
                                                         │  failing traces │
                                                         └─────────────────┘
```

**Component responsibilities**
- **Web app (Next.js / TypeScript):** UI + REST/RPC API. Owns auth, dashboard, all read/write to DB.
- **GitHub App integration (Octokit):** installation flow, webhook receiver, repo reads, PR/check-run writes.
- **Postgres:** system of record for agents, checkpoints, eval results, installations, orgs, users. Large blobs (traces, raw eval output) go to object storage (S3-compatible) referenced by URL; metadata stays in Postgres. Add `pgvector` later for trace/skill embeddings (Phase 3 discovery search).
- **Eval Runner:** executes eval suites and returns structured results. Two modes (§7 F4). Python, because the LLM-eval ecosystem is Python.
- **Diagnosis Agent:** an LLM call (Claude) that takes the structured delta and produces a human-readable cause + recommendation.

---

## 4. Roadmap + Why

The strategy is **wedge → map → front-door → platform**. Each phase earns the next; do not skip ahead.

### Phase 0 — Validate (no product code)
Prove the core assumption (§1.4). Survey + interviews. Out of scope for this spec but gates everything.
**Why:** avoids building the wrong thing for six months.

### Phase 1 — The Builder Wedge (this is the build target)
The thing one developer installs on a Saturday and immediately gets a "wow" from.
Features: one-click connect, agent + eval detection, checkpoint creation, eval runner, eval-as-property-of-checkpoint, regression detection + bound traces, behavioral diff + rewind, diagnosis agent, dataset builder.
**Goal:** land developers and earn *love*. Metric: teams still active at week 4 (≥30%).
**Why first:** it is the only slice that (a) is a painkiller a solo dev feels, (b) has low integration cost (read-only repo wrap, no rewrite), and (c) builds the registry the later phases need.

### Phase 2 — The Map / System of Record (monetization begins)
Features: agent registry, dependency/blast-radius graph, cost + tool-call efficiency, golden dataset management, team layer (RBAC, shared baselines), retention tiers.
**Goal:** become the record a team cannot rip out; first revenue at the individual→team boundary.
**Why second:** the registry *falls out* of Phase 1 (you already versioned every agent). Monetize the moment a second person needs the first's history.

### Phase 3 — Consumer Front-Door + Platform (enterprise expansion)
Features: discovery directory, cross-team monitoring, unified surface / one-shot trigger, eval-informed orchestration, governance, SSO, VPC deploy.
**Goal:** consumer discovery drives team-by-team org spread; land mid-market org-wide deals.
**Why last:** requires the populated map to exist. "Use any agent seamlessly" means normalizing many heterogeneous hosted agents — brutally expensive unless builders already registered them for you via Phase 1.

**Sequencing rule to enforce in code decisions:** *if it's an attribute of a checkpoint, it's early; if it's a system you'd have to operate (hosting, inference serving, general logging), it's late or out.*

---

## 5. Data Model (Postgres)

Concrete starting schema. Adjust field types as needed; this is the shape.

```sql
-- An installed GitHub App on an org/user account
CREATE TABLE installations (
  id                BIGINT PRIMARY KEY,          -- GitHub installation_id
  account_login     TEXT NOT NULL,               -- org or user login
  account_type      TEXT NOT NULL,               -- 'Organization' | 'User'
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- AgentGit users (login via GitHub OAuth)
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id         BIGINT UNIQUE NOT NULL,
  login             TEXT NOT NULL,
  email             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- A connected repository
CREATE TABLE repos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id   BIGINT REFERENCES installations(id),
  github_repo_id    BIGINT NOT NULL,
  full_name         TEXT NOT NULL,               -- 'org/repo'
  default_branch    TEXT NOT NULL DEFAULT 'main',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (github_repo_id)
);

-- A detected/declared agent within a repo
CREATE TABLE agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id           UUID REFERENCES repos(id),
  name              TEXT NOT NULL,
  description       TEXT,
  path              TEXT NOT NULL,               -- root dir of the agent within the repo
  entrypoint        TEXT,                        -- file/function to invoke (if known)
  framework         TEXT,                        -- 'langgraph' | 'crewai' | 'raw' | ...
  eval_command      TEXT,                        -- how to run its evals (from agentgit.yaml or detected)
  dataset_path      TEXT,                        -- golden dataset location (if any)
  owner_team        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (repo_id, path)
);

-- The core primitive: an immutable snapshot of an agent at a commit
CREATE TABLE checkpoints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID REFERENCES agents(id),
  git_commit_sha    TEXT NOT NULL,
  branch            TEXT,
  prompt_hash       TEXT,                        -- hash of concatenated prompt files
  skills_snapshot   JSONB,                       -- [{path, version, hash}]
  tools_snapshot    JSONB,                       -- [{name, schema_hash}]
  is_live           BOOLEAN DEFAULT false,       -- deploy status (read-only, best-effort)
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, git_commit_sha)
);

-- An eval run against a checkpoint
CREATE TABLE eval_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id     UUID REFERENCES checkpoints(id),
  eval_name         TEXT NOT NULL,               -- suite/metric name
  aggregate_score   NUMERIC,                     -- 0..1 or metric-native
  passed            BOOLEAN,
  total_cases       INT,
  failed_cases      INT,
  cost_usd          NUMERIC,
  input_tokens      BIGINT,
  output_tokens     BIGINT,
  runner_mode       TEXT,                        -- 'github_action' | 'hosted'
  raw_output_url    TEXT,                        -- object-store link to full output
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Per-case results within an eval run (enables regression bound-traces + diagnosis)
CREATE TABLE eval_cases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_run_id       UUID REFERENCES eval_runs(id),
  case_id           TEXT NOT NULL,               -- stable id of the test case
  input             JSONB,
  expected          JSONB,
  actual            JSONB,
  score             NUMERIC,
  passed            BOOLEAN,
  trace_url         TEXT                          -- object-store link to full trace
);

-- Regression events (computed on new eval runs)
CREATE TABLE regressions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID REFERENCES agents(id),
  from_checkpoint   UUID REFERENCES checkpoints(id),  -- last good
  to_checkpoint     UUID REFERENCES checkpoints(id),  -- the one that regressed
  score_delta       NUMERIC,                     -- negative
  newly_failing     JSONB,                       -- [case_id, ...]
  diagnosis         TEXT,                        -- LLM output (nullable until generated)
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Golden datasets (Phase 1 basic, Phase 2 full versioning)
CREATE TABLE datasets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID REFERENCES agents(id),
  name              TEXT NOT NULL,
  version           INT NOT NULL DEFAULT 1,
  rows              JSONB,                       -- [{input, expected, labels, source}]
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. The `agentgit.yaml` Config Convention

Auto-detection (see F2) gets you 70% of the way; a small opt-in config closes the gap without forcing a rewrite. AgentGit looks for `agentgit.yaml` at repo root. Everything in it is optional — it only *overrides/augments* detection.

```yaml
# agentgit.yaml — optional, lives at repo root
version: 1

agents:
  - name: support-bot
    path: agents/support            # root dir of the agent
    entrypoint: agents/support/main.py:run_agent
    framework: langgraph
    eval:
      command: "python -m pytest agents/support/evals -q --json"
      dataset: agents/support/evals/golden.jsonl
      result_format: agentgit-json      # see §7 F4 result schema
    deploy:
      # optional: how to detect which version is live
      detect: env                    # 'env' | 'webhook' | 'manual'
      env_var: SUPPORT_BOT_SHA

  - name: sre-agent
    path: agents/sre
    framework: crewai
    eval:
      command: "promptfoo eval -c agents/sre/promptfooconfig.yaml --output json"
      result_format: promptfoo
```

---

## 7. Features (detailed)

For each feature: **Goal**, **Target user**, **Phase**, **Technical spec** (how it actually works).

---

### F1 — One-click GitHub install (connect)
- **Goal:** get an agent's repo connected in <10 minutes with zero code changes, so AgentGit can read it. This is the entire adoption thesis — friction here kills everything.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec — what "one-click install" actually does:**

Use a **GitHub App** (not an OAuth App, not a personal access token). Rationale: fine-grained per-repo permissions, org-installable, receives webhooks, and issues short-lived installation tokens.

1. **App registration (one-time, by us):** Register the GitHub App with these permissions:
   - `contents: read` — read repo files (prompts, skills, eval scripts, source).
   - `metadata: read` — basic repo info.
   - `pull_requests: write` — post regression comments on PRs.
   - `checks: write` — post eval results as a Check Run (the green/red on a commit).
   - `webhooks` subscribed to: `push`, `pull_request`, `installation`, `installation_repositories`.
   - Store the App's **private key** (PEM) as a secret; it signs JWTs.

2. **Install flow (per user):**
   - User clicks "Connect GitHub" → redirect to `https://github.com/apps/<app-name>/installations/new`.
   - GitHub shows the repo-picker; user selects repos + grants permissions.
   - GitHub redirects back to our `callback_url` with `installation_id`.
   - We persist the installation (`installations` table) and enumerate repos via the installation.

3. **Getting a working token (per API call):**
   - Create a short-lived **App JWT** signed with the private key (`iss = app_id`, 10-min expiry).
   - Exchange it: `POST /app/installations/{installation_id}/access_tokens` → returns an **installation access token** (1-hour expiry, scoped to granted repos).
   - Use that token with Octokit to read the repo (`GET /repos/{owner}/{repo}/contents/...` or clone via `x-access-token:<token>@github.com`).

4. **Webhook receiver:** an endpoint that verifies the `X-Hub-Signature-256` HMAC against the webhook secret, then handles:
   - `push` → trigger checkpoint creation + eval run for affected agents (F3/F4).
   - `pull_request` → run eval on the PR head, post results as a check + comment (F4/F6).
   - `installation` / `installation_repositories` → sync `repos` table.

5. **First-run scan:** immediately after install, kick off F2 (detection) on the default branch so the user sees their agents in the dashboard within seconds — this is the start of the "wow".

**Acceptance:** user connects a repo and, without editing any code, sees a list of detected agents in the dashboard.

---

### F2 — Agent & eval detection
- **Goal:** figure out *what agents exist in the repo* and *how to evaluate each*, automatically, so the user doesn't have to configure much.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec — how it finds agents, eval scripts, and eval results:**

Detection is **heuristic + convention + optional config** (`agentgit.yaml` overrides all).

**(a) Detecting agents.** Scan the repo tree (via contents API or a shallow clone) for signals:
- Directories containing `SKILL.md` files (Anthropic Agent Skills convention).
- Files importing known frameworks: `langgraph`, `langchain`, `crewai`, `autogen`, `llama_index`, `agno`, `openai` Agents SDK, `anthropic` SDK with tool loops.
- Files matching `agent.yaml`, `*.agent.py`, `agents/**`, `prompts/**`.
- A prompt directory (many `.md`/`.txt`/`.j2` files referenced by code).
- Group these into candidate agents by nearest common directory; present them to the user to confirm/rename (cheap human-in-the-loop beats wrong auto-guesses).

**(b) Detecting eval scripts.** Look for:
- `evals/`, `eval/`, `tests/evals/`, `**/*.eval.py`, `**/*_eval.py`.
- Config files of known eval tools: `promptfooconfig.yaml` (promptfoo), files importing `deepeval`, `ragas`, `langsmith`/`langchain.evaluation`, `braintrust`, `inspect_ai`.
- A `Makefile`/`package.json`/`pyproject.toml` script named like `eval`, `evals`, `test:eval`.
- If `agentgit.yaml` declares an `eval.command`, use that verbatim.

**(c) Detecting eval *results* (two situations):**
- **They already run evals in CI** → we don't re-run; we *ingest*. Options:
  1. If they add our GitHub Action (F4 Mode A), it emits results in our schema and we store them directly.
  2. If they use promptfoo/deepeval/etc., we parse the tool's native JSON output (support a small set of adapters: `promptfoo`, `deepeval`, `braintrust`, `agentgit-json`).
- **They have no evals** → detection returns "no evals found"; we offer the **dataset builder** (F9) and an eval scaffold, and we can run a default generic eval (e.g., LLM-as-judge on a generated dataset) so the first run still produces a score.

**(d) Output:** populate `agents` rows (with `eval_command`, `dataset_path`, `framework`), shown in the dashboard for confirmation.

**Acceptance:** for a repo using a common eval tool or `agentgit.yaml`, AgentGit correctly lists agents and knows how to run each one's evals with zero manual config beyond confirming names.

---

### F3 — Checkpoint creation
- **Goal:** turn each meaningful change into an immutable, queryable snapshot of the whole agent (not just code).
- **Target user:** Builder (invisible; it's the substrate).
- **Phase:** 1.

**Technical spec:**
- Trigger: `push` webhook (and PR head commits).
- For each affected agent (agent `path` is a prefix of a changed file, or config/prompt/skill within it changed):
  1. Read the agent's files at the commit SHA.
  2. Compute `prompt_hash` (stable hash of concatenated prompt files in deterministic order), `skills_snapshot` (each `SKILL.md` path + content hash), `tools_snapshot` (tool/function schemas + hashes — parse from framework definitions or a declared tools file).
  3. Insert a `checkpoints` row keyed by `(agent_id, git_commit_sha)` (idempotent).
- A checkpoint is created **before** its eval runs; the eval run attaches to it (F4).

**Acceptance:** every push that touches an agent produces exactly one checkpoint capturing code+prompt+skills+tools at that SHA.

---

### F4 — Eval runner
- **Goal:** actually execute the agent's evals and attach structured results to the checkpoint. This is what makes AgentGit *not a passive filing cabinet* — it judges, it doesn't just store.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec — two modes:**

**Mode A — GitHub Action (ship this first; cheapest).**
- Publish an action, e.g. `agentgit/eval-action@v1`. User adds ~5 lines to their workflow (or we open a PR that adds it):
  ```yaml
  - uses: agentgit/eval-action@v1
    with:
      agentgit-token: ${{ secrets.AGENTGIT_TOKEN }}
      # optional overrides; defaults read agentgit.yaml
  ```
- The action: checks out the repo, reads `agentgit.yaml` (or detected command), runs the eval command in *their* CI runner (their secrets, their env), captures stdout/JSON, normalizes to the **AgentGit result schema**, and POSTs to `POST /api/eval-runs` with the checkpoint's commit SHA.
- Advantage: **we run no untrusted code and no inference** — their runner does. Fast to ship, no sandbox to build.

**Mode B — Hosted runner (build later; needed for teams with no eval-in-CI, i.e. most of the ICP).**
- We execute the eval ourselves in an isolated sandbox:
  - Sandbox: containerized (start with Docker + resource limits + no host mounts; graduate to Firecracker/gVisor microVMs for stronger isolation when running untrusted code).
  - Steps: clone repo at SHA → install deps (detect `requirements.txt`/`pyproject`/`package.json`) → run eval command against the agent (either invoking their code, or hitting a declared agent **endpoint**).
  - **Secrets/BYOK:** the user supplies their LLM provider keys, stored encrypted (envelope encryption; decrypt only inside the sandbox at run time). We never run inference on our own keys for their agent.
  - Cost/tokens captured from provider response metadata → written to `eval_runs.cost_usd`, `input_tokens`, `output_tokens`.
- Queue: push jobs to a worker pool (BullMQ/Redis or Postgres-backed queue). Workers are Python (eval ecosystem is Python).

**The AgentGit result schema (`agentgit-json`):**
```json
{
  "agent": "support-bot",
  "commit_sha": "a5f3c2d",
  "eval_name": "support-golden-v3",
  "aggregate_score": 0.83,
  "passed": true,
  "total_cases": 120,
  "failed_cases": 8,
  "cost_usd": 0.42,
  "input_tokens": 190000,
  "output_tokens": 24000,
  "cases": [
    {
      "case_id": "refund_policy_01",
      "input": {"query": "..."},
      "expected": {"contains": "..."},
      "actual": {"response": "..."},
      "score": 0.0,
      "passed": false,
      "trace": {"steps": [ ... ]}   // stored to object store, referenced by trace_url
    }
  ]
}
```
Adapters normalize promptfoo/deepeval/braintrust output into this shape.

**Acceptance:** on a push, an eval runs (Mode A or B), and an `eval_runs` row + `eval_cases` rows are attached to the checkpoint, with per-case pass/fail and trace links.

---

### F5 — Eval-as-a-property-of-every-checkpoint
- **Goal:** the differentiating primitive — every version *knows its own score*. This is what GitHub/Git structurally cannot give you.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec:**
- This is a *modeling* guarantee, not a separate service: `checkpoints ⇄ eval_runs` are joined; the dashboard's per-agent timeline renders each checkpoint with its score inline.
- UI: an **agent timeline** — a vertical list of checkpoints (commit, date, author) each annotated with its eval score, pass/fail, cost, and a colored delta vs the previous checkpoint. This is the primary screen.

**Acceptance:** opening an agent shows a timeline where every version displays its measured quality.

---

### F6 — Regression detection + bound traces
- **Goal:** proactively catch "this change made the agent worse" and show *exactly* which cases now fail. This is the "wow" moment.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec:**
- On each new `eval_run` for an agent:
  1. Find the **baseline** = the most recent prior checkpoint on the same branch (or the last "good"/live one, configurable).
  2. Compute `score_delta = new.aggregate_score − baseline.aggregate_score`.
  3. If `score_delta < −threshold` (default e.g. 0.03, configurable per agent), OR the set of failing `case_id`s gained new members, create a `regressions` row.
  4. `newly_failing = failing(new) − failing(baseline)` (set diff on `case_id`).
- **Bound traces:** for each newly-failing case, surface its `trace_url` so the user jumps straight from "quality dropped" to "here is the exact failing interaction."
- **Surfacing:**
  - Dashboard: red banner on the agent + the regression detail view.
  - On PRs: post a Check Run (red) + a PR comment: `AgentGit: support-bot quality dropped 12% (0.83 → 0.71). 8 newly failing cases. [view]`.
  - Optional: notification (email/Slack) — the "instantly know" outcome users wish for.

**Acceptance:** a change that lowers eval score produces a regression event listing the newly-failing cases with links to their traces, visible in-app and on the PR.

---

### F7 — Behavioral diff + rewind
- **Goal:** compare two versions by *behavior* (not just code), and restore the last good one.
- **Target user:** Builder.
- **Phase:** 1.

**Technical spec:**
- **Behavioral diff:** given two checkpoints, show (a) the config diff (prompt/skills/tools changes — computed from the snapshots/hashes) and (b) the *behavior* diff — for each shared `case_id`, show `actual` output old vs new side by side, highlighting cases whose pass/fail flipped. This is the feature users currently fake by "running prompts by hand in two browser tabs."
- **Rewind-to-last-good:** identify the most recent checkpoint with passing eval above baseline; provide a one-click that opens a PR reverting the agent's files to that commit's state (we don't force-push; we propose a PR — safe + reviewable).

**Acceptance:** user can select two checkpoints and see what changed in config *and* in behavior; and can generate a revert PR to the last good version in one click.

---

### F8 — Diagnosis agent
- **Goal:** don't just show a regression — explain *why* it happened and suggest a fix. Storing regressions is a filing cabinet; explaining them is the product.
- **Target user:** Builder.
- **Phase:** 1 (this is a key differentiator; only AgentGit has version diff + eval delta + failing traces in one place to reason over).

**Technical spec:**
- Trigger: on a new `regressions` row (or on demand).
- Assemble a **context bundle**:
  - The config diff between `from_checkpoint` and `to_checkpoint` (prompt/skills/tools/code changes).
  - The eval delta (score before/after, counts).
  - The newly-failing cases: input, expected, actual, and trace steps for each (cap at N cases / token budget).
- Prompt an LLM (Claude) with a structured instruction: *"Given the change and these newly-failing cases, identify the most likely cause and a specific recommended fix. Be concrete; reference the exact prompt/tool change if it's implicated."*
- Store output in `regressions.diagnosis`; render it in the regression view.
- **Boundary (important):** diagnosis **ends at a recommendation in words**. It does NOT auto-modify the user's code. Auto-fix is explicitly out of scope (trust hazard + competes with coding agents). Let the human (or their existing coding agent) apply the fix.

**Acceptance:** for a detected regression, AgentGit produces a plausible, specific written explanation of the likely cause + a recommended fix, grounded in the actual diff and failing traces.

---

### F9 — Dataset builder (from traces/logs)
- **Goal:** most target teams have *no* eval set, which blocks everything. Generate a starter golden dataset from their real traffic so "run the eval" becomes possible at all. This is the on-ramp *and* the long-term retention moat.
- **Target user:** Builder.
- **Phase:** 1 (basic) → 2 (full versioning + annotation queue).

**Technical spec (Phase 1 basic):**
- Ingest traces/logs the user connects (uploaded, or captured via a lightweight SDK/callback, or pulled from their existing tracing tool).
- Cluster / sample representative inputs (dedup, coverage across input types).
- For each sampled input, propose an `expected` (via LLM draft) and queue for quick human confirmation (thumbs / edit).
- Persist as a `datasets` row (v1). This becomes the golden set the eval runner uses.
- Also: **capture production failures** (thumbs-down / flagged outputs) into the dataset over time — the flywheel. Failures that used to vanish become permanent test cases.

**Phase 2 additions:** dataset versioning, content-addressable rows, annotation queues, reviewer state.

**Acceptance:** a user with no eval set can generate a usable starter golden dataset from their traces in one flow, and thereafter run evals against it.

---

### F10–F13 — Phase 2 (the map / monetization) — spec at a high level
Build only after Phase 1 lands. Included so the data model and code are shaped correctly now.

- **F10 Agent registry:** falls out of `agents` + `checkpoints`. A per-org view of every agent, its live version, current score, cost, owner. This *is* the map.
- **F11 Dependency / blast-radius graph:** parse shared skills/tools across agents (`skills_snapshot`/`tools_snapshot` referencing shared files/packages); build a graph so "change skill X → these agents may break." Store edges; render graph; on a shared-skill change, flag dependent agents for re-eval.
- **F12 Cost + tool-call efficiency:** aggregate `eval_runs.cost_usd`/tokens per agent/version; add per-tool timing/failure stats parsed from traces. Analytics only — **not** inference routing.
- **F13 Team layer (paid trigger):** orgs, roles (RBAC), shared eval baselines, "who changed what." Introduce billing at the individual→team boundary. Retention tiers (free keeps 30 days of history; paid keeps forever).

---

### Phase 3 — Consumer front-door (spec at a high level)
- **Discovery directory:** a searchable view of the org's registry for *consumers* — what each agent does, health/eval badge, how to call it, owner. Uses `pgvector` over agent descriptions/skills for semantic search.
- **Cross-team monitoring:** one view of the whole estate's health/cost.
- **Unified surface / one-shot trigger / eval-informed routing:** invoke agents from one place; route context between them using the interfaces the registry already knows. Earned because AgentGit holds the map.
- **Governance, SSO, VPC deploy:** enterprise requirements.

---

## 8. Non-Goals (explicitly out of scope — do not build)
- **Auto-fixing / code-modifying agent** (diagnosis ends at a recommendation).
- **Inference hosting / routing / a gateway** (different company; cost *annotation* only).
- **Fine-tuning** (wrong user).
- **Being the deploy system** (read deploy status; never perform deploys — at most open a PR).
- **A general observability/logging platform** (only keep eval-run traces bound to checkpoints).
- **A framework you author agents in** (AgentGit is an overlay on existing agents, never a framework — this is the key differentiator vs git-native frameworks).

---

## 9. Recommended Tech Stack (pragmatic, single-team-buildable)

> **Amendment (2026-07-06):** Foundational choices are being decided in `/changes` and the register in `docs/decisions.md`, and they **override this section where they differ**. Superseded here: the API is a **dedicated NestJS service** (not Next.js route handlers — bullet 1 below); messaging is **NATS JetStream** as event bus + queue (not BullMQ/Redis — the "Queue + workers" bullet and §7 F4); Mode B eval workers are **HTTP-callback sandboxes** that POST results back (they never consume the bus). See `2026-07-06-backend-stack-decision.md` and `2026-07-06-event-bus-nats.md`.

- **Web app + API:** Next.js (App Router) + TypeScript. API via route handlers or a thin tRPC layer.
- **GitHub integration:** `@octokit/*` (App auth, webhooks via `@octokit/webhooks`).
- **DB:** Postgres (Supabase or Neon for speed). `pgvector` extension (add in Phase 3).
- **Object storage:** any S3-compatible bucket for traces/raw eval output.
- **Queue + workers:** BullMQ + Redis (or Postgres-backed queue for simplicity) driving **Python** eval workers.
- **Eval execution:** Python (adapters for promptfoo/deepeval/braintrust/agentgit-json); sandbox = Docker (MVP) → Firecracker/gVisor (when running untrusted code at scale).
- **Diagnosis:** Anthropic API (Claude) for the diagnosis agent.
- **Auth:** GitHub OAuth (login) + GitHub App (repo access). Keep them distinct.
- **Secrets:** encrypted at rest (KMS/envelope encryption); provider keys (BYOK) decrypted only inside sandboxes.

---

## 10. MVP Build Order (concrete)
Build Phase 1 as a thin vertical slice that produces the "wow" as early as possible. Suggested order:

1. **Auth + GitHub App skeleton:** OAuth login; register the GitHub App; implement install flow + callback; persist `installations`/`repos`. (F1)
2. **Repo read + detection:** on install, scan default branch; detect agents + eval commands; populate `agents`; show them in a bare dashboard. (F2)
3. **Checkpoint on push:** webhook receiver (verified) → create `checkpoints` for affected agents. (F3)
4. **Eval runner Mode A (GitHub Action):** ship the action + `POST /api/eval-runs`; normalize one adapter first (`agentgit-json` or `promptfoo`). Attach `eval_runs` + `eval_cases` to checkpoints. (F4)
5. **Timeline UI + eval-as-property:** per-agent checkpoint timeline with scores/deltas. (F5)
6. **Regression detection + bound traces + PR comment:** the "wow". Compute deltas + newly-failing; post Check Run + PR comment. (F6)
7. **Diagnosis agent:** context bundle → Claude → store + render. (F8)
8. **Behavioral diff + rewind PR.** (F7)
9. **Dataset builder (basic) + Mode B hosted runner:** unblock the no-eval majority. (F9, F4 Mode B)

**Stop after step 7 for the first design-partner demo** if needed — steps 1–7 already deliver: connect → see quality timeline → catch a regression on a PR → get told why. That is the smallest lovable wedge.

> **Reminder (do not skip):** everything above is worth building **only if** the core assumption in §1.4 holds. If Phase 0 validation shows builders shrug at silent regressions, revisit the wedge before completing this build. Ship the thin slice (steps 1–7), put it in front of real teams, and let their reaction gate the rest.

---

## 11. Open Questions / Assumptions to Resolve During Build
- **Eval heterogeneity:** how many distinct eval formats must adapters support before detection "just works" for most teams? Start with 2–3; expand from real repos.
- **No-eval majority:** what fraction of target users have *zero* evals? If most, prioritize F9 (dataset builder) + Mode B earlier than this order suggests.
- **Baseline definition:** is "last checkpoint on branch" the right regression baseline, or "last live/tagged good"? Make it configurable; default to last-on-branch.
- **Trace availability:** diagnosis quality depends on having real failing traces. If a team's evals don't emit traces, diagnosis degrades to config-diff reasoning only — acceptable but weaker; note in UI.
- **Deploy-status detection:** `is_live` is best-effort (env var / webhook / manual). Don't over-invest; it's an annotation, not a deploy system.
