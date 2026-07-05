# Conventions

**Living "how we build X here" references.** Read the relevant one *before* writing code in that area — they encode decisions already made so you don't re-derive or drift. Each is authoritative for its domain and kept current with the code.

How the three doc layers relate:
- **`docs/decisions.md`** — the *status index* of heavy decisions (decided / open).
- **`changes/`** — dated *decision records* (ADRs): why + when we chose something.
- **`docs/conventions/`** (this folder) — the *how*: the patterns, rules, and examples to follow while coding.

## Index

| Doc | Governs | Decisions |
|---|---|---|
| [`data-model.md`](data-model.md) | Tenancy, RLS, IDs, immutability, audit, ORM usage. Read before any DB work. | D1, D6, D8, audit |
| [`api-and-versioning.md`](api-and-versioning.md) | Internal vs public API, versioning, the `agentgit-json` contract, the Action contract. | D4 |
| [`events.md`](events.md) | Event envelope, subjects, schema registry, the outbox pattern, consumer rules. | D5 |
| [`auth.md`](auth.md) | Identity (AuthN) boundary + authorization (AuthZ) layer. | D2, D3 |
| [`security.md`](security.md) | Secrets/BYOK encryption, the KMS interface, sandbox isolation. | D9, D10 |
| [`frontend-routing.md`](frontend-routing.md) | Next.js App Router: route groups, server components, typed routes, auth middleware. | D13 |

All of these were locked on 2026-07-06 — see [`../../changes/2026-07-06-foundational-decisions.md`](../../changes/2026-07-06-foundational-decisions.md).

## The meta-rule

For the heavy one-way-door areas, the pattern is almost always **"build the clean seam now; slot the heavier implementation in later."** Concretely: one `authorize()` layer (not scattered role checks), one identity boundary (not GitHub hardwired everywhere), one event envelope (not ad-hoc JSON), tenant isolation in the schema from row zero. Follow the seams these docs define and future upgrades stay contained.
