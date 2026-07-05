# Sprint 01 — Connect & Detect

- **Status:** planned
- **Build steps (spec §10):** 1–2
- **Goal:** A developer connects a repo via the GitHub App and, without editing any code, sees a list of detected agents in a bare dashboard.

## Scope
| Task | Feature | Build step | Status |
|---|---|---|---|
| GitHub App install flow + callback + webhook receiver + auth skeleton | [F1](../../features/F1-github-connect/) | 1 | not started |
| Repo scan → detect agents + eval commands → persist + show | F2 (create folder when started) | 2 | not started |

## Definition of done
- OAuth login works; internal `user_id` + `identities` in place (per `docs/conventions/auth.md`).
- GitHub App installs; `installations` + `repos` persisted; webhooks verified.
- On install, the default branch is scanned; detected agents land in `agents` (with `org_id` + RLS) and render in a minimal dashboard.
- Data-model rules honored (RLS, UUIDv7); an ADR exists for any deviation.

## Out of scope
No eval running, checkpoints, regressions, or diagnosis yet (later sprints / build steps 3+).

## Retro (fill when the sprint closes)
- What shipped:
- What changed vs the plan:
- Follow-ups / debt:
