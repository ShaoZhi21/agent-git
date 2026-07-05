# packages/auth — AGENTS.md

**Read before editing. AuthN and AuthZ are separate concerns — keep them apart.**

## Purpose
The two access layers, behind clean seams so the heavy implementations slot in later:
- **AuthN** — identity boundary. Canonical internal `user_id`; providers map in via `identities`. GitHub is the first provider; SSO/SAML (Zitadel/Keycloak) plugs in later without touching domain code.
- **AuthZ** — one `authorize(subject, action, resource)` function. RBAC now; OpenFGA (ReBAC) later, call sites unchanged.

## Non-negotiable rules (from [`docs/conventions/auth.md`](../../docs/conventions/auth.md))
- Never store a provider id (e.g. `github_id`) on domain rows — reference `user_id`.
- Never inline a role check — always call `authorize()`.
- `org_id` comes from session+membership, never from client input (feeds both RLS and AuthZ).
- AuthZ (app-layer permissions) is distinct from RLS (DB-layer tenant isolation); both always apply.

## Structure (agent-maintained)
```
src/
  index.ts        placeholder (TODO F1)
  (authn/ , authz/ , session.ts added at build step 1)
```

## Status
Scaffold — not implemented. First work: build step 1 (F1).

## Notes (agent-maintained)
- 2026-07-06 — scaffolded.
