# The Architect

**AI-native governance and enterprise accountability platform built for transparent public systems, auditable automation, and secure agent workflows.**

The Architect is a full-stack prototype for institutions, regulators, enterprises, and civic operators that need three things at the same time:

- transparent records of money, risk, and decisions
- AI assistance that stays inside policy boundaries
- auditability strong enough for public trust and compliance review

This repository powers the local and demo-ready implementation of that stack: a Next.js application, governance APIs, enterprise onboarding flows, ledger modules, deterministic DPI security, Gemini-powered analysis, and tamper-evident audit plumbing.

**Repository:** https://github.com/qubitpage/thearchitect  
**Latest release:** https://github.com/qubitpage/thearchitect/releases/latest

## What This Project Is For

Most governance and enterprise software fails in the same places:

- spending is hard to inspect end to end
- compliance is fragmented across spreadsheets, tickets, and vendor tools
- AI outputs are hard to trust, review, or constrain
- audit trails are incomplete or easy to dispute
- enterprise risk signals live in disconnected systems

The Architect is designed to resolve those gaps with one unified operating surface.

It brings together:

- **ledger-style accountability** for public transactions and impact reporting
- **secure AI workflows** with DPI checks before and after agent execution
- **enterprise onboarding and governance** with policy packs, scoring, and review flows
- **audit-ready APIs** for dashboards, exports, and external observers

## What The Stack Does

### 1. Governance and Ledger Layer

The platform tracks structured records that matter to institutions and enterprises:

- **GovLedger** for public spending, review status, classifications, and risk signals
- **Impact Ledger** for emissions, labor, waste, biodiversity, water, and supply-chain reporting
- **jurisdiction and operating context** for pilots, readiness, and module activation
- **review actions** for acceptance, quarantine, rejection, and escalation paths

### 2. AI and Security Layer

The AI side is not exposed directly. It is wrapped in a deterministic control layer:

- **Lobster Trap-style DPI** for ingress and egress inspection
- checks for prompt injection, credential leakage, PII exposure, exfiltration, unsafe commands, and policy mismatches
- **Gemini-powered analysis** for governance, compliance, risk, anomaly, document, and policy tasks
- role-aware workflows so AI operates inside reviewable system boundaries

### 3. Enterprise and Compliance Layer

The repo also includes the enterprise governance surface:

- enterprise onboarding and tenant setup
- compliance packs and policy enforcement
- AI task execution with audit traces
- governance dashboards, risk findings, and operator review loops
- API-key based enterprise access patterns with hashed storage

### 4. Audit and Persistence Layer

Everything is designed to be inspectable and replaceable:

- local development store for fast demo iteration
- PostgreSQL-ready data layer using Drizzle ORM and migrations
- audit event capture and proof-oriented export paths
- public-repo-safe secret handling rules and push hygiene

## Current Capabilities

What ships in this repository today:

- Next.js 16 App Router application for operator, demo, and guide experiences
- enterprise dashboard and onboarding flow
- `/api` and `/api/v2` routes for governance, enterprise, audit, DPI, system health, and seed flows
- deterministic DPI rule engine with compliance-oriented actions
- Gemini integration points with demo-safe fallback behavior when keys are absent
- Drizzle schema and migrations for PostgreSQL-backed persistence
- whitepaper, constitution, pitch deck, and public narrative assets

## Architecture

```text
Web UI / Demo / Guide
        |
        v
Next.js App Router
        |
        +-- Enterprise onboarding and dashboard
        +-- GovLedger and impact APIs
        +-- Audit and system health APIs
        +-- DPI inspection and policy actions
        +-- Gemini-backed governance tasks
        |
        v
Core platform modules
        |
        +-- RBAC
        +-- DPI engine
        +-- Audit layer
        +-- Enterprise services
        +-- Gov / labor / jurisdiction modules
        |
        v
Persistence
        +-- Local .data store for development
        +-- PostgreSQL-ready schema via Drizzle
```

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database layer:** PostgreSQL + Drizzle ORM + Drizzle Kit
- **Validation:** Zod
- **Security primitives:** bcryptjs, deterministic DPI rules, audit-chain patterns
- **Identifiers:** uuid
- **UI:** lucide-react icons and custom dashboard components

## Why The Stack Matters

This stack is built to answer a practical question:

**How do you let AI participate in governance, enterprise risk, or compliance workflows without giving it unchecked authority?**

The answer in this repo is:

- inspect all sensitive AI traffic
- keep actions structured and reviewable
- preserve audit history
- separate runtime secrets from public source
- build modules as explicit APIs instead of opaque agent behavior

## Key Routes and APIs

Core routes already exposed in the repo include:

- `GET /api/system` for system snapshot data
- `GET /api/platform/roadmap` for release and milestone state
- `GET /api/platform/health` for subsystem readiness
- `GET|POST /api/jurisdictions` for registry management
- `POST /api/govledger/transactions` for public spending intake
- `POST /api/impact-ledger/entries` for impact reporting
- `POST /api/security/inspect` for DPI inspection
- `PATCH /api/reviews/{id}` for review state transitions
- `/api/v2/*` routes for the expanded enterprise and governance surface

## Quick Start

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Optional local binding:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3010
```

## Verification

```powershell
npm run lint
npm run build
```

## Repository Layout

- `src/app` — pages, API routes, App Router entrypoints
- `src/components` — demo, dashboard, and guide UI
- `src/lib/core` — audit, DPI, RBAC, event infrastructure
- `src/lib/db` — schema, connection, migration helpers
- `src/lib/modules` — enterprise, gov, labor, impact, and AI service modules
- `drizzle` — generated migrations and metadata
- `public` — whitepaper, constitution, pitch deck, public assets
- `scripts` — project seeding and support utilities

## Security Posture

This repository is intended to stay public and publishable.

- no production credentials, private keys, database dumps, or personal data exports belong in Git
- `.env*` is ignored except `.env.example`
- `.data/`, `.next/`, `node_modules/`, local databases, key material, logs, and backups are ignored
- `SECURITY.md` defines the push checklist and disclosure policy
- `.gitleaks.toml` is included for teams that run secret scanning

Before every push:

```powershell
npm run lint
npm run build
git status --short --ignored
```

## Public Documents

- `/constitution.html`
- `/THE_ARCHITECT_CONSTITUTION.md`
- `/THE_ARCHITECT_PITCH_DECK.pdf`
- `/GDCOS_WHITEPAPER.md`
- `/THE_ARCHITECT_WHITEPAPER.html`

These documents frame the broader governance thesis behind the software, while this repository contains the concrete implementation surface.

## Roadmap

1. Complete the move from local dev storage to fully wired PostgreSQL runtime persistence.
2. Expand role models for citizen, operator, auditor, council, and regulator workflows.
3. Deepen export bundles and immutable audit verification.
4. Separate public transparency views from operator-only control surfaces.
5. Integrate real Lobster Trap proxy deployment for production ingress and egress inspection.
6. Add stronger procurement comparison, anomaly detection, and investigation tooling.
7. Expand sector modules across finance, labor, utilities, healthcare, platforms, and defense.
8. Support multi-jurisdiction federation and portability across deployments.

## License

The public framework documents are intended for open civic collaboration. Confirm the final repository license and contribution policy before accepting external contributions.
