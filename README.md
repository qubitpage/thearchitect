# The Architect

**A civilization operating protocol for transparent governance, universal sector accountability, AI safety, and human purpose.**

The Architect is an open, opt-in control plane for institutions that want power to become visible, money to become traceable, harm to become accountable, and AI to remain under human authority.

This repository contains the first runnable implementation slice: a Next.js console with GovLedger public finance intake, Universal Sector Impact Ledger reporting, Lobster Trap-style deep prompt inspection, review actions, and an audit stream.

## What Is Running Now

- **GovLedger**: public spending records with classification, risk scoring, review status, and audit events.
- **Impact Ledger**: emissions, water, waste, labor, biodiversity, animal welfare, and supply-chain risk reporting.
- **AI Firewall**: deterministic DPI inspection for prompt injection, credential leakage, PII exposure, exfiltration, unsafe commands, and fabricated citations.
- **Review Actions**: accept, return to review, quarantine, or reject ledger entries.
- **Live Snapshot API**: one endpoint for dashboard state and external observers.
- **Local Persistence**: development JSON store ignored by Git and ready to be replaced by PostgreSQL.

## System Map

```text
Operator Console
			|
			v
Next.js App Router API
			|
			+-- GovLedger transaction intake
			+-- Universal Sector impact intake
			+-- AI DPI inspection policy
			+-- Review action endpoint
			+-- Audit event stream
			|
			v
Development store (.data, ignored by Git)
```

## Quick Start

```powershell
npm install
npm run dev
```

Open the app at the URL printed by Next.js, normally:

```text
http://localhost:3000
```

For the local workspace port used during development:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3010
```

## Verify

```powershell
npm run lint
npm run build
```

## API

### System Snapshot

```http
GET /api/system
```

Returns metrics, recent GovLedger transactions, impact entries, DPI inspections, and audit events.

### GovLedger Transaction

```http
POST /api/govledger/transactions
Content-Type: application/json
```

```json
{
	"jurisdiction": "Founding City Pilot",
	"institution": "Public Works Authority",
	"counterparty": "Civic Infrastructure Labs",
	"amount": 1250000,
	"currency": "EUR",
	"category": "infrastructure",
	"purpose": "Bridge repair procurement with public tender and milestone escrow.",
	"classification": "public"
}
```

### Impact Ledger Entry

```http
POST /api/impact-ledger/entries
Content-Type: application/json
```

```json
{
	"actorName": "Civic Materials Group",
	"sector": "construction",
	"jurisdiction": "Founding City Pilot",
	"reportingPeriod": "2026-Q2",
	"emissionsTonsCo2e": 54000,
	"waterM3": 220000,
	"wasteKg": 18000,
	"laborIncidents": 0,
	"animalWelfareScore": 100,
	"biodiversityImpact": 8,
	"supplyChainRisk": 42
}
```

### DPI Inspection

```http
POST /api/security/inspect
Content-Type: application/json
```

```json
{
	"actor": "governance-agent",
	"direction": "ingress",
	"content": "Review the procurement file and preserve citizen privacy."
}
```

### Review Action

```http
PATCH /api/reviews/{id}
Content-Type: application/json
```

```json
{
	"status": "accepted"
}
```

Allowed statuses: `accepted`, `pending_review`, `quarantined`, `rejected`.

## Security Posture

This repository is designed to be public.

- No production API keys, credentials, private keys, tokens, or database dumps should be committed.
- `.env*` files are ignored except `.env.example`.
- `.data/`, `.next/`, `node_modules/`, local databases, private key material, logs, backups, and generated screenshots are ignored.
- `SECURITY.md` documents the push checklist and reporting policy.
- `.gitleaks.toml` is included for teams that run Gitleaks.

Before pushing changes:

```powershell
npm run lint
npm run build
git status --short --ignored
```

## Current Documents

- `/THE_ARCHITECT_PITCH_DECK.pdf`
- `/GDCOS_WHITEPAPER.md`

## Roadmap

1. Replace local JSON persistence with PostgreSQL and migrations.
2. Add auth roles: citizen, institution operator, auditor, sector council, transparency authority.
3. Add immutable audit hashing and export bundles.
4. Add public read-only transparency portal separate from operator intake.
5. Integrate real Lobster Trap proxy deployment for model ingress and egress.
6. Add procurement bid comparison and anomaly detection.
7. Add sector council workflows for food, water, energy, housing, finance, platforms, defense, and healthcare.
8. Add multi-jurisdiction federation and data portability exports.

## License

The public framework documents are intended for open civic collaboration. Confirm the final repository license before accepting external contributions.
