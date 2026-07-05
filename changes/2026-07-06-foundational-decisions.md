# Foundational decisions locked (D1–D12)

- **Date:** 2026-07-06
- **Type:** decision (batch) — resolves the remaining open items in `docs/decisions.md`
- **Depth lives in:** [`../docs/conventions/`](../docs/conventions/) (the "how"); this ADR is the dated "what + why".

In one working session the remaining heavy decisions were reviewed with tradeoffs and all recommendations accepted. Each links to its convention doc for implementation detail.

## Decisions

| # | Decision | Why (one line) | Detail |
|---|---|---|---|
| **D1** | Multi-tenancy = shared DB + `org_id` + Postgres **RLS** from day 1 | Tenant isolation can't be retrofitted; RLS makes it a DB guarantee | [`data-model.md`](../docs/conventions/data-model.md) |
| **D6** | ORM = **Drizzle** | SQL-first, respects RLS session vars (Prisma tends to bypass RLS) | [`data-model.md`](../docs/conventions/data-model.md) |
| **D8** | IDs = **UUIDv7** | Sortable + index-friendly + global; free win, permanent once referenced | [`data-model.md`](../docs/conventions/data-model.md) |
| **audit** | History **append-only** + audit log | The trustworthy record *is* the product; cheap now, painful later | [`data-model.md`](../docs/conventions/data-model.md) |
| **D2** | AuthN behind an identity boundary; internal `user_id`, providers map to it | GitHub now, SSO/SAML later without a rewrite | [`auth.md`](../docs/conventions/auth.md) |
| **D3** | AuthZ = one central `authorize()` layer; RBAC now → OpenFGA later | Avoid scattered role checks; cross-team sharing is a relationship problem | [`auth.md`](../docs/conventions/auth.md) |
| **D4** | External surfaces versioned from **v1**; `agentgit-json` carries a version | External contracts freeze once someone depends on them | [`api-and-versioning.md`](../docs/conventions/api-and-versioning.md) |
| **D5** | One **CloudEvents-style envelope** + schema registry + outbox | Events are long-lived cross-service contracts | [`events.md`](../docs/conventions/events.md) |
| **D9** | BYOK via envelope encryption behind a **KMS interface** (Vault default) | Customer keys safe at rest, decrypted only in the sandbox | [`security.md`](../docs/conventions/security.md) |
| **D10** | Sandbox direction = **gVisor/Firecracker**, HTTP-callback, egress-locked | Untrusted code is the top risk; OSS + self-hostable (G1). *Finalize at build step 9* | [`security.md`](../docs/conventions/security.md) |
| **D11** | Observability = **OpenTelemetry** from day 1 | Vendor-neutral; dashboard stays swappable | (defaults) |
| **D12** | Monorepo = **pnpm + Turborepo** | Standard, low-ceremony | (defaults) |

## Spec amendments (spec §5)
- Adds `orgs` + `org_id` on all domain tables + RLS.
- `users` no longer keys on `github_id`; GitHub becomes a row in `identities`.
- IDs change from `gen_random_uuid()` (v4) to **UUIDv7**.
- `checkpoints` / `eval_runs` / `eval_cases` / `regressions` are **append-only**; adds an `audit_log`.

## Consequences
- Convention docs under `docs/conventions/` are now authoritative for their domains; read them before coding.
- Intended monorepo layout: `apps/web`, `apps/api`, `packages/db`, `packages/contracts`, `packages/events`, `packages/auth`, `services/eval-sandbox` (Python, Mode B).
- D10/D11/D12 have a locked *direction*; exact tooling finalizes when first built.
- All choices honor the open-core / self-hostable constraint ([`2026-07-06-open-core-self-host.md`](2026-07-06-open-core-self-host.md)).
