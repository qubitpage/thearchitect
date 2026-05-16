# The Architect Platform Development Plan

This plan turns the first runnable control-plane slice into a staged platform for transparent governance, universal sector accountability, AI safety, and jurisdiction federation.

## Development Principles

- Build the control plane as a working system first, not a marketing shell.
- Keep public trust features inspectable: APIs, audit events, release metadata, and documents must be visible.
- Keep all runtime secrets, local stores, generated builds, and private deployment state out of Git.
- Prefer small, verified platform increments over large speculative rewrites.

## Phase 1 - Foundation Spine

Status: in progress.

Delivered:

- GovLedger intake, risk scoring, review state, and audit events.
- Impact Ledger intake and deterministic risk scoring.
- AI DPI inspection with redaction and quarantine actions.
- Jurisdiction Registry for candidate, pilot, active, and paused jurisdictions.
- Platform roadmap and health endpoints.
- Public release assets: whitepaper, pitch deck, and Multiplanetary Constitution.

Next:

- Add automated API smoke tests.
- Add role model for citizen, operator, auditor, sector council, and transparency authority.
- Add signed audit event hashes.

## Phase 2 - Persistence and Proofs

Target: 30-60 days.

- Replace local JSON with PostgreSQL migrations.
- Add append-only audit hash chain.
- Add public export bundles for transparency data.
- Add import/export portability for jurisdictions.
- Add deployment secret management and environment validation.

## Phase 3 - Public Trust Portal

Target: 60-90 days.

- Separate public read-only portal from operator intake.
- Add search and filters for transactions, impact entries, jurisdictions, and audit events.
- Add public issue reporting and correction requests.
- Add release/document provenance page.

## Phase 4 - Federation Operations

Target: 90-180 days.

- Multi-jurisdiction policy packs.
- Delegated review queues and council workflows.
- Inter-jurisdiction data portability.
- Sector council dashboards for food, water, energy, housing, finance, platforms, defense, and healthcare.

## Current Engineering Slice

The current slice establishes the platform spine: APIs for platform roadmap, platform health, and jurisdiction onboarding, plus dashboard panels for modules, milestones, and jurisdiction registry state.

## Verification Commands

```powershell
npm run lint
npm run build
```

API smoke checks:

```powershell
curl http://127.0.0.1:3010/api/platform/health
curl http://127.0.0.1:3010/api/platform/roadmap
curl http://127.0.0.1:3010/api/jurisdictions
```