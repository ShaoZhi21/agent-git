# Product explanation
<!-- What this change does for the user/product and why it matters now.
     One or two paragraphs, no implementation jargon — a PM should be able
     to read only this section and understand the PR. -->

# Technical explanation
<!-- How it actually works. Fill the subsections that add signal; delete the
     ones that don't (a schema-only PR may not need a diagram). -->

## Architecture diagram (if necessary)
<!-- ASCII or mermaid sketch of the components this PR adds/changes and how
     they connect to what already exists. -->

## Key changes as a data flow
<!-- Trace the main path end-to-end:
     input (request/webhook/event) → validation → transformation → state
     change/effect → output. Call out where tenancy (RLS/org_id), auth, and
     idempotency apply on the path. -->

## Main changes in code
<!-- Per file/module: what changed and WHY it's shaped that way (the
     non-obvious decisions, not a diff restatement). Note anything a
     reviewer would otherwise have to reverse-engineer. -->

# Linked work
- **Feature:** `features/F<n>-<name>/`
- **Sprint:** `sprints/sprint-NN/`

# Checklists

## Conventions followed (read before)
- [ ] Read the relevant `docs/conventions/*` before coding
- [ ] Stayed within the feature's scope (checked `docs/spec.md` §8 non-goals)
- [ ] TypeScript end-to-end; no new language boundary without an ADR

## Docs updated (write after — same PR)
- [ ] Feature **worklog** updated (plan + what changed + new status)
- [ ] Folder **`AGENTS.md`** updated if structure/patterns/entry points changed
- [ ] **`changes/`** ADR added if a decision was made or spec/convention deviated
- [ ] **`docs/`** updated if behavior/architecture/convention changed
- [ ] **Sprint** status/board updated

## Verification (before "done")
- [ ] Exercised against the feature's **acceptance criteria**
<!-- How was this verified? Commands, output, screenshots. -->

<!-- Commit/PR authored by you. No AI co-author trailers. -->
