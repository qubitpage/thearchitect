# Security Policy

The Architect repository must not contain production secrets, credentials, private keys, personal data exports, database snapshots, or generated runtime stores.

## What Is Blocked From Git

- `.env*` files except `.env.example`
- `.data/` local runtime storage
- `.next/`, `node_modules/`, coverage, logs, and build output
- private keys and certificate material (`*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt`)
- local databases (`*.db`, `*.sqlite`, `*.sqlite3`)
- generated archives and backups

## Before Every Push

Run:

```powershell
npm run lint
npm run build
git status --short --ignored
```

Then run a secret scan with your available tooling. The repository includes `.gitleaks.toml` for projects that use Gitleaks.

## AI Safety Layer

The prototype includes a deterministic DPI policy layer in `src/lib/security-policy.ts`. It detects prompt injection, credential leakage, PII exposure, exfiltration attempts, unauthorized destructive commands, and fabricated citation instructions.

## Reporting

Report vulnerabilities privately to the maintainer. Do not open public issues containing exploit details, credentials, or personal information.