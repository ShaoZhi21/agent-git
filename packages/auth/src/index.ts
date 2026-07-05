// @agent-git/auth — identity boundary (AuthN) + the single authorize() layer (AuthZ).
//
// Read ../../docs/conventions/auth.md BEFORE touching login or permissions.
// AuthN: canonical internal user_id (UUIDv7); providers (GitHub first) map in via
//        an identities table; nothing else knows HOW someone logged in.
// AuthZ: EVERY permission check goes through authorize(subject, action, resource).
//        Start RBAC; swap internals to OpenFGA later without touching call sites.
//        Never scatter `if (role === ...)`.
//
// TODO(F1): identity boundary + session; authorize() with RBAC memberships.
export {};
