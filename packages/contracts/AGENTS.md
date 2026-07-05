# packages/contracts — AGENTS.md

**Read before editing. These are public promises — treat every change as potentially breaking.**

## Purpose
The **external, versioned contracts** that outside parties depend on: the `agentgit-json` eval-result schema, the GitHub Action inputs/outputs, and public API request/response shapes. Defined once here (zod + generated JSON Schema), consumed by `apps/api`, the Action, and the Python sandbox.

## Non-negotiable rules (from [`docs/conventions/api-and-versioning.md`](../../docs/conventions/api-and-versioning.md))
- **Versioned from v1.** `agentgit-json` carries a top-level `version`.
- **Additive-only within a version** (new optional fields OK). Breaking change → new version, both supported through the deprecation window.
- **Never repurpose a field.** Add a new one.
- Validate every inbound external payload against these schemas at the API edge.

## Structure (agent-maintained)
```
src/
  index.ts        placeholder (TODO F4: agentgit-json v1)
  (agentgit-json/ , api/ schemas added per feature)
```

## Status
Scaffold — not implemented. First contract: `agentgit-json` v1 at build step 4 (F4).

## Notes (agent-maintained)
- 2026-07-06 — scaffolded.
