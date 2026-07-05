# Auth Conventions (Identity & Authorization)

**Read before touching login, sessions, memberships, or any permission check.** Locked 2026-07-06 (D2, D3). Two independent concerns — keep them separate:
- **AuthN ("who are you")** — identity, behind a boundary so we can add SSO later without a rewrite.
- **AuthZ ("what may you do")** — one central `authorize()` layer, never scattered role checks.

Amends spec §5: `users` no longer keys on `github_id`; GitHub becomes one row in an `identities` table.

---

## 1. AuthN — identity boundary (D2)

**The canonical identity is our own internal `user_id` (UUIDv7).** External providers map *to* it; they are never the identity themselves.

```
users(id uuidv7, email, name, created_at)                 -- the person
identities(id, user_id → users.id, provider, provider_user_id, created_at)
   -- provider = 'github' today; 'oidc:<tenant>' / 'saml:<tenant>' later
   -- UNIQUE(provider, provider_user_id)
```

**Rules:**
1. **Never store `github_id` (or any provider id) on domain rows.** Domain rows reference `user_id`. GitHub is just the first login method.
2. All login flows go through one **AuthN module** (`packages/auth` / an API module) that: verifies the provider, finds-or-creates the `user` + `identity`, issues our session. Nothing else in the app knows *how* someone logged in.
3. **Sessions:** httpOnly, Secure, SameSite cookies backed by server-side sessions (or short-lived JWT + refresh). Session carries `user_id` and the **active `org_id`**.
4. **Two distinct GitHub roles — do not conflate** (spec §9): GitHub **OAuth** = user login (this doc). GitHub **App** = repo access / installation tokens (see [`security.md`](security.md) + spec F1). Different tokens, different purposes.

**Future SSO/SAML/SCIM (Phase 3):** plug an OSS IdP (**Zitadel** or Keycloak, self-hostable per G1) in as another `provider`. Because domain code only sees `user_id`, this is additive — no call sites change.

---

## 2. AuthZ — one `authorize()` layer (D3)

**Every permission check goes through a single function.** No inline `if (role === 'admin')` anywhere — that scattering is the exact trap we're avoiding.

```ts
authorize(subject, action, resource): void  // throws ForbiddenError if denied
// subject = { userId, orgId }; action = 'agent.edit'; resource = the target
```
Wrap it as a NestJS guard/decorator so handlers declare intent (`@Authorize('agent.edit')`) and the check is uniform.

**Start with RBAC**, modeled as data:
```
memberships(user_id, org_id, role)   -- role: 'owner' | 'admin' | 'member' | 'viewer'
```
`authorize()` resolves the subject's role in `resource.orgId` and checks it against an action→role policy table.

**Path to ReBAC (relationships) without a rewrite:** when cross-team sharing lands (Phase 2/3 — "team X can view team Y's agent"), swap `authorize()`'s *internals* to **OpenFGA** (OSS/CNCF, self-hostable). Call sites are unchanged because they only ever called `authorize()`. Model authorization as data/relationships, never as branching logic spread through the code.

---

## 3. How AuthZ relates to RLS

Two layers, both always on (see [`data-model.md`](data-model.md) §6):
- **RLS** = tenant data isolation (Org A ≠ Org B) — enforced in Postgres.
- **`authorize()`** = role/feature permissions *within* an org — enforced in the app.

`authorize()` never substitutes for RLS and vice-versa. Derive `org_id` from the session+membership, **never** from client input, then set it as both the RLS tenant context and the AuthZ subject org.
