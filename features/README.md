# features/

Forward-looking specs — **one file per feature**. This is where a feature gets fleshed out from the high-level spec (`docs/spec.md` §7) into an implementation-ready plan *before* code is written.

Empty for now by design (we're setting up basics; features get vetted later). The canonical feature list lives in `docs/spec.md` §7 as F1–F13.

## Convention

- **Filename:** `F<n>-<kebab-name>.md` — e.g. `F1-github-install.md`, `F6-regression-detection.md`.
- **One feature per file.** Don't bundle.
- **Create the file when you start the feature**, expanding from the spec. Don't pre-write all 13 — draft them just-in-time so they reflect what you've learned.

## Suggested template

```markdown
# F<n> — <name>

- **Spec ref:** docs/spec.md §7 F<n>
- **Phase:** <1 | 2 | 3>
- **Target user:** <Builder | Consumer>
- **Status:** <not-started | in-progress | done>
- **Depends on:** <other F# / infra>

## Goal
<one paragraph — the user-visible outcome>

## Acceptance criteria
<the concrete "done" test from the spec, made checkable>

## Design
<data model touched, API shape, UI, flow — the how>

## Out of scope
<explicit non-goals for this feature; cross-check docs/spec.md §8>

## Open questions
<what needs a decision before/while building>
```

## Feature index (from spec §7)

| ID | Name | Phase | Build step (§10) |
|---|---|---|---|
| F1 | One-click GitHub install | 1 | 1 |
| F2 | Agent & eval detection | 1 | 2 |
| F3 | Checkpoint creation | 1 | 3 |
| F4 | Eval runner (Mode A → B) | 1 | 4, 9 |
| F5 | Eval-as-property-of-checkpoint | 1 | 5 |
| F6 | Regression detection + bound traces | 1 | 6 |
| F7 | Behavioral diff + rewind | 1 | 8 |
| F8 | Diagnosis agent | 1 | 7 |
| F9 | Dataset builder | 1→2 | 9 |
| F10 | Agent registry | 2 | — |
| F11 | Dependency / blast-radius graph | 2 | — |
| F12 | Cost + tool-call efficiency | 2 | — |
| F13 | Team layer (RBAC, billing) | 2 | — |

> **Phasing discipline:** don't build Phase 2/3 features until Phase 1's core assumption (spec §1.4) is validated.
