# AD ISO 27001 Compliance Toolkit

Tooling for auditing Active Directory user accounts against ISO/IEC 27001:2022 access-control requirements, and a dashboard for visualizing the results.

## What's in this repo

| Path | Purpose |
|---|---|
| [Get-ADUserAudit.ps1](Get-ADUserAudit.ps1) | PowerShell script that queries AD, evaluates each user against compliance rules (password age, dormancy, missing metadata, privileged access), and exports CSV/JSON reports. |
| [Compliance_Scripts.ps1](Compliance_Scripts.ps1) | Supporting compliance check scripts. |
| [ad-dashboard/](ad-dashboard/) | React app (`ADDashboard.jsx`) that imports the exported JSON and renders compliance KPIs, charts, and drill-down tables. |
| [ISO27001_ADCompliance.md](ISO27001_ADCompliance.md) | Maps AD user lifecycle controls to ISO 27001:2022 Annex A clauses (A.5, A.6, A.8, A.9, A.12) with audit event IDs, review cadences, and severity thresholds. |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Full install, configuration, scheduling, hardening, and troubleshooting guide. |
| [docker-compose.yml](docker-compose.yml) | Runs the built dashboard as a static site on port 8080. |
| `report/` | **Not tracked in git.** Audit output lands here and contains real usernames, emails, and account data — see [Security](#security--data-handling) below. |

## Quick start

1. Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for prerequisites and full setup steps.
2. Run the audit script on a domain-joined host with the AD PowerShell module (**requires PowerShell 7.6+**):
   ```powershell
   pwsh -File .\Get-ADUserAudit.ps1 -ExportPath .\report
   ```
3. Start the dashboard with Docker:
   ```bash
   docker compose up --build
   # Dashboard available at http://localhost:8080
   ```
4. In the dashboard, import the latest `report/DashboardData_*.json`.

## Security & data handling

`Get-ADUserAudit.ps1` exports real Active Directory data (SAM account names, emails, department, manager, privileged group membership, password age). Treat every file in `report/` as sensitive:

- `report/` is excluded via [.gitignore](.gitignore) — never commit or push it.
- Restrict filesystem permissions on the export path (see the "Security Hardening" section of [SETUP_GUIDE.md](SETUP_GUIDE.md)).
- If you need to share compliance results externally, publish only aggregated/anonymized figures, not the raw exports.

## Compliance mapping

See [ISO27001_ADCompliance.md](ISO27001_ADCompliance.md) for the full control mapping, critical/high/medium non-compliance indicators, and the quarterly access review process.
