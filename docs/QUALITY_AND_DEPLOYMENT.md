# Quality and Deployment Notes

## Quality Goals

Biodiversity Seed Passport is designed as a production-ready MVP, not a simple demo.

Quality goals:
- stable smart contract architecture
- meaningful custom contract functions
- tested contract behavior
- clear frontend and backend separation
- mobile responsive UI
- loading, success, and error states
- product validation through feedback collection
- analytics and usage tracking
- deployment-ready repository structure
- CI/CD validation

## Smart Contract Quality

The Soroban contract includes custom data structures, persistent storage, custom errors, event emission, platform initialization, seed lot lifecycle logic, custody transfer logic, viability update logic, sample reservation, sample release, risk flagging, distribution logic, and registry stats.

Contract tests cover initialization, duplicate initialization rejection, seed lot creation, low viability review, sample reservation, sample release, custody transfer, unauthorized transfer rejection, viability updates, risk flagging, full distribution, over-reservation rejection, and invalid score rejection.

## Frontend Quality

The frontend includes a responsive dashboard, wallet handling, contract function coverage display, action workspace, transaction status panel, error messages, seed lot registry display, wallet interaction proof section, user feedback form, analytics events, and monitoring summary.

Handled states:
- wallet not found
- wallet not connected
- user request failed
- action loading
- action success
- action failure
- missing feedback input

## Backend Quality

The backend includes health check, runtime config, contract function coverage, wallet interaction records, user feedback records, analytics summary, and product readiness summary.

## CI/CD Validation

GitHub Actions should validate smart contract, frontend, backend, and deployment config.

CI should use actions/checkout@v6, actions/setup-node@v6, Node.js 24, and wasm32v1-none Rust target.

## Local Verification

Run:
.\scripts\verify-level4.ps1

The script should check contract format, contract tests, WASM release build, Stellar contract build, frontend install/type-check/build/test, backend install/type-check/build, docs, and deployment files.

## Deployment Files

The repo should include:
- vercel.json
- railway.toml
- Procfile

## Environment Notes

Recommended local baseline:
- Node.js 24.x
- npm 11.x
- Rust 1.96.x
- Cargo 1.96.x
- Stellar CLI 27.x
- Rust target wasm32v1-none
- PowerShell 5.1
- Git 2.54.x

## Windows PowerShell JSON Encoding Note

When creating JSON files in PowerShell 5.1, avoid UTF-8 BOM issues. For package.json, tsconfig.json, postcss.config.json, and vercel.json, prefer UTF-8 without BOM.

## Final Review Checklist

Before submission, verify GitHub Actions green, README complete, contract folder exists, frontend service layer exists, backend service layer exists, docs exist, deployment config exists, no temporary build files committed, contributors correct, and main branch contains the latest finished version.
