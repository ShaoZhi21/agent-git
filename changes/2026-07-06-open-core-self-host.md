# Open-core, self-hostable core, Apache-2.0

- **Date:** 2026-07-06
- **Type:** decision (strategic) — resolves **G1** (self-hostability) and **G2** (OSS stance) in `docs/decisions.md`
- **Gates:** D2 (auth), D7 (DB host), D9 (secrets), D10 (sandbox), D11 (observability), and the dependency-license policy below

## Context
Should AgentGit be open source ("free, like GitHub")? Untangled two axes that were conflated:
1. **Adoption model** — free-tier / product-led (bottoms-up). *This* is the GitHub trait.
2. **Source licensing** — open-sourcing the code. GitHub itself is **closed source** with a free tier; the open-source analog is **GitLab** (open-core).

## Decision
- **Adoption:** free-tier / PLG. A developer self-serves free; no sales call for the wedge.
- **Licensing: open-core.**
  - **OSS core — Apache-2.0, self-hostable by construction.** Scope = the Phase 1 builder wedge (connect, checkpoints, evals, regression, diagnosis) for one dev/team.
  - **Commercial layer** = Phase 2/3 team/enterprise: RBAC, SSO/SAML/SCIM, the cross-team map/discovery, governance, retention tiers, VPC support, SLAs.
  - The split follows the spec's **own** monetization boundary (individual → team) — no new line invented.
- **This resolves G1 = "yes, the core is self-hostable by construction."** Managed services are allowed only as *conveniences behind an interface that has an OSS/self-hostable equivalent* — never as hard dependencies in the core path.

## Dependency-license policy (direct consequence)
- **Distributed OSS core:** permissive licenses only — MIT / Apache-2.0 / BSD / ISC.
- **Quarantine** copyleft (GPL/AGPL) and source-available (SSPL/BSL) to optional, dev-only, or separately-run components — never linked into the distributed core. (Enforce with a license check in CI later.)

## Why
- **Trust is the #1 adoption barrier and OSS collapses it.** AgentGit reads teams' prompts/agents/tools (their IP); "here's the source, self-host it" beats any compliance badge.
- **The long tail is community contributions.** Detection + eval adapters (promptfoo/deepeval/ragas/…) are exactly what a community PRs.
- **Distribution.** OSS is the growth engine an early dev-tool can't buy.
- **The moat isn't the code** — it's the hosted convenience, the *populated cross-org map* (network/data a clone can't copy), and the commercial team/enterprise features. Proven by GitLab, Sentry, PostHog, Supabase, Grafana.

## Alternatives considered
- **Fully proprietary:** max control, no dep constraint — but forfeits the trust/adoption flywheel and complicates self-host/VPC. Rejected (cuts against the product's trust dynamic + OSS conviction).
- **Source-available (BSL/SSPL):** some self-host + clone-resistance, but *not* OSI-OSS — the community treats it as closed (why Mongo/Elastic/Redis/HashiCorp took reputational hits). Rejected for the core.
- **AGPL core:** genuinely OSI-OSS and clone-deterrent (forces competitor SaaS to open changes), but adds enterprise legal friction. Held in reserve — revisit *only if* cloud-cloning becomes a real threat. Start Apache-2.0.

## Consequences (the cascade)
- **D7 DB** → vanilla Postgres, no provider-proprietary features in the core path.
- **D2 Auth** → OSS IdP path (Zitadel/Keycloak) for SSO; core auth self-hostable.
- **D9 Secrets** → Vault or a KMS abstraction with a self-hostable default.
- **D10 Sandbox** → gVisor/Firecracker (OSS) over managed sandboxes (E2B/Modal).
- **D11 Observability** → OpenTelemetry + Grafana LGTM (OSS), swappable.
- **Asymmetry accepted:** you can open-source later but never un-open — chose to open the core *now* because the adoption bought outweighs the optionality kept.

## Open
- Exact core-vs-commercial split per feature — finalize as each feature is built, along the individual→team line.
- Whether/when a separate "enterprise edition" repo/dir is needed (GitLab/PostHog pattern).
