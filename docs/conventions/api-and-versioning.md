# API & Versioning Conventions

**Read before designing any endpoint, the GitHub Action, or the `agentgit-json` schema.** Locked 2026-07-06 (D4). The governing idea: **internal APIs stay fluid; every *external* surface is versioned from v1 and its contract is frozen the moment an outsider depends on it.**

---

## 1. Two API planes — treat them completely differently

| | **Internal** (frontend ⇄ our API) | **External** (anyone else depends on it) |
|---|---|---|
| Consumers | our own Next.js app | users' CI, the GitHub Action, webhooks, future SDK/partners |
| Style | **tRPC** (end-to-end TS types) | **OpenAPI**-described REST, `/api/v1/...` |
| Versioning | none — deploy client+server together | **strict, from v1** |
| Change freedom | rename/reshape freely | additive-only within a version |

If a payload can reach a machine you don't deploy in lockstep, it's **external** — apply §2–§4.

---

## 2. Versioning rules (external only)

- **Namespace from day one:** public HTTP routes under `/api/v1/`. The GitHub Action is pinned `agentgit/eval-action@v1`. The `agentgit-json` schema carries a top-level `version`.
- **Additive = non-breaking, allowed within a version:** new optional fields, new endpoints, new enum values consumers can ignore.
- **Breaking = new version:** removing/renaming a field, changing a type, making an optional field required, changing semantics. → introduce `/api/v2` (or Action `@v2`) and keep the old one alive through the deprecation window.
- **Never repurpose a field.** Add `field_v2`; don't silently change what `field` means. External consumers parse by name forever.

### Breaking vs non-breaking cheat sheet
| Change | Breaking? |
|---|---|
| Add optional response field | No |
| Add new endpoint / event type | No |
| Add enum value | No* (document that clients must tolerate unknowns) |
| Remove or rename a field | **Yes** |
| Change a field's type or units | **Yes** |
| Make an optional request field required | **Yes** |
| Tighten validation on existing input | **Yes** |

## 3. Deprecation policy (external)

Announce → dual-run old + new → sunset. Public surfaces get a **generous window (≥6–12 months)**. Signal deprecation in-band (`Deprecation` / `Sunset` headers, changelog, and — for the Action — a warning annotation). Never hard-break a version in use.

---

## 4. The `agentgit-json` eval contract — the most important external schema

This is what the GitHub Action (Mode A) and hosted sandbox (Mode B) emit, and what third-party adapters (promptfoo/deepeval/…) normalize to. Once external CI emits it, its shape is a public promise.

- **Versioned envelope:** top-level `"version": "1.0"`. Adapters declare which version they target.
- **Schema is source-controlled** in `packages/contracts` as a zod schema **and** a published JSON Schema; validate every inbound payload against it at `/api/v1/eval-runs`.
- **Additive evolution only** within `1.x`; a breaking change is `2.0` with both accepted during the window.
- Shape follows spec §7 F4 (`agent`, `commit_sha`, `eval_name`, `aggregate_score`, `passed`, counts, cost/tokens, `cases[]` with per-case trace refs). Large `trace` blobs go to object storage; the payload carries a reference (see spec §5 `trace_url`).

## 5. The GitHub Action contract

- Inputs/outputs (`atlas-token` → `agentgit-token`, optional overrides) are a **contract**; additive-only within `@v1`.
- Ship a moving `@v1` tag that users pin; publish immutable `@v1.2.3` under it.
- The Action authenticates with a scoped `AGENTGIT_TOKEN` and POSTs `agentgit-json` to `/api/v1/eval-runs`.

---

## 6. Cross-cutting API rules

- **OpenAPI is the source of truth** for the public plane → generate typed clients (incl. the future SDK) from it; don't hand-maintain clients.
- **Error format:** one consistent shape everywhere — RFC 9457 `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`). No bespoke error blobs per endpoint.
- **Idempotency:** webhook processing dedupes on GitHub delivery id; external POSTs that create resources accept an `Idempotency-Key`. (At-least-once delivery is assumed everywhere — see [`events.md`](events.md).)
- **Auth on public routes:** scoped tokens (per-installation / per-purpose), never a global key. See [`auth.md`](auth.md) and [`security.md`](security.md).
- **Pagination:** cursor-based (the `id` is UUIDv7 = sortable), not offset.
