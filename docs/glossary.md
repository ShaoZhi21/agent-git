# Glossary

Domain vocabulary for AgentGit. Define each term **once, here**; reference it everywhere else. If code or docs introduce a new domain concept, add it here in the same pass.

| Term | Definition |
|---|---|
| **AgentGit** | The product's working name — a placeholder ("GitHub for AI agents"), expected to change. `docs/spec.md` is the canonical reference. "The map of a company's agents." |
| **Agent** | An LLM-powered system that answers questions, calls tools, or runs multi-step tasks. The unit AgentGit tracks. One repo may contain several. |
| **Checkpoint** | **The core primitive.** An immutable snapshot of an agent at a commit, capturing everything that defines its behavior (prompt, skills, tools, code) plus its measured quality (eval result, cost, deploy status). See spec §2.2. |
| **Builder** | User who *develops* agents. Primary user for Phases 1–2. Pain: agents regress silently. |
| **Consumer** | User who *uses* agents others built. Primary user for Phase 3. Pain: can't discover/trust/reuse. |
| **The map** | The record of what every agent is and whether it works. Owning it is the strategic thesis (spec §1.3). |
| **Eval run** | An execution of an agent's evaluation suite against a checkpoint, producing an aggregate score + per-case results. Attaches to exactly one checkpoint. |
| **Eval case** | A single test case within an eval run: input, expected, actual, score, pass/fail, and a trace. |
| **Regression** | A detected drop in quality between a baseline checkpoint and a new one — score fell below threshold, or the set of failing cases grew. See spec §7 F6. |
| **Baseline** | The checkpoint a new eval run is compared against. Default: last checkpoint on the same branch (configurable to last live/tagged good). Spec §11. |
| **Bound traces** | The exact failing interaction traces linked to a regression's newly-failing cases — jump from "quality dropped" to "here's why." |
| **Diagnosis agent** | An LLM (Claude) call that reasons over the config diff + eval delta + failing traces to explain *why* a regression happened and recommend a fix. Ends at a written recommendation — never auto-modifies code (spec §8). |
| **Behavioral diff** | Comparing two checkpoints by *behavior* (per-case output old vs new, pass/fail flips) — not just code. Spec §7 F7. |
| **Golden dataset** | The curated set of input/expected cases an agent's evals run against. Can be built from real traffic when a team has none (spec §7 F9). |
| **`agentgit.yaml`** | Optional config at the connected repo's root that declares agents, entrypoints, and eval commands. Overrides/augments auto-detection (spec §6). |
| **Mode A (eval runner)** | Eval runs in the user's own CI via a GitHub Action; results POSTed to AgentGit. We run no untrusted code/inference. Ship first. Spec §7 F4. |
| **Mode B (eval runner)** | Eval runs in AgentGit's own isolated sandbox (Docker → microVM). For teams with no eval-in-CI. Build later. Spec §7 F4. |
| **BYOK** | Bring Your Own Key — the user supplies their LLM provider keys; encrypted at rest, decrypted only inside the sandbox. |
| **Blast-radius graph** | Dependency graph of shared skills/tools across agents: "change skill X → these agents may break." Phase 2 (spec §7 F11). |
