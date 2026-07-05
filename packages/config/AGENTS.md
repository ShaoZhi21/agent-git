# packages/config — AGENTS.md

**Read before editing. Shared config lives here so it's defined once.**

## Purpose
Workspace-wide config presets so every app/package stays consistent: shared ESLint, Prettier, and (later) reusable tsconfig presets. The root [`../../tsconfig.base.json`](../../tsconfig.base.json) is the base every package extends today.

## Rules
- Change lint/format/tsconfig rules **here**, not per-package, unless a package genuinely needs an override.
- Keep presets minimal and OSS-only.

## Structure (agent-maintained)
```
(placeholder — add eslint-preset.js, prettier-preset.json when tooling is wired at build step 1)
```

## Status
Scaffold — presets added when linting/formatting is wired up (build step 1).

## Notes (agent-maintained)
- 2026-07-06 — reserved; root `tsconfig.base.json` is the shared TS base for now.
