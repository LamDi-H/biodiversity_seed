# Biodiversity Seed Passport

Production-ready Stellar Soroban MVP for seed-bank provenance, custody tracking, viability monitoring, and biodiversity preservation.

## Overview

Biodiversity Seed Passport helps seed banks, research labs, conservation NGOs, and community seed programs manage seed lots with a transparent on-chain audit trail.

The app tracks seed accessions, custody transfers, sample reservations, viability updates, risk flags, and distribution records on Stellar Testnet.

## Problem

Seed banks and biodiversity programs often manage important seed records across spreadsheets, paper records, or siloed private systems.

This creates several problems:

- custody history is hard to verify
- sample movement across institutions is not transparent
- researchers may not know available seed inventory
- conservation teams have limited proof of seed distribution
- reporting is difficult when data is scattered across different systems

## Solution

Biodiversity Seed Passport provides a Stellar-based seed passport system.

Each seed lot can be:

- registered with accession metadata
- assigned to a custodian
- reviewed for viability
- reserved for research or field trials
- released back into inventory
- transferred between custodians
- flagged for risk
- marked as distributed to conservation or community seed programs

## Why Stellar

Stellar is a strong fit because the product needs low-cost, transparent, and verifiable records for real-world conservation workflows.

Soroban smart contracts provide:

- low-cost testnet transactions
- programmable custody and audit logic
- transparent public verification
- fast transaction confirmation
- a practical path from MVP to institutional pilot

## Target Users

- Seed banks
- Agricultural research labs
- Conservation NGOs
- Community seed banks
- Biodiversity preservation programs
- Researchers running field trials

## Level 4 Product Scope

This repository is structured as a production-ready MVP with:

- custom Soroban smart contract
- React dashboard frontend
- backend API service
- product validation and feedback flow
- analytics and monitoring section
- wallet interaction tracking
- mobile responsive UI
- CI/CD validation
- deployment configuration
- architecture and quality documentation

## Smart Contract

Location:

    contracts/biodiversity_seed

Main write functions:

- initialize
- create_seed_lot
- transfer_custody
- record_viability
- reserve_samples
- release_samples
- flag_risk
- mark_distributed

Main read functions:

- get_seed_lot
- get_custody_record
- get_custody_count
- get_stats
- get_config

Main data structures:

- PlatformConfig
- SeedLot
- CustodyRecord
- RegistryStats
- DataKey
- SeedError

## Frontend

Location:

    frontend

The frontend is a React and Vite dashboard with:

- wallet connection flow
- contract runtime card
- registry metric cards
- contract action workspace
- transaction status panel
- seed lot dashboard
- user feedback form
- wallet interaction proof section
- analytics and monitoring summary
- responsive layout for mobile screens

Important files:

- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/contractConfig.ts
- frontend/src/services/contract.ts
- frontend/src/services/api.ts
- frontend/src/services/analytics.ts

## Backend

Location:

    server

The backend is an Express API for product validation and operational support.

Endpoints:

- GET /health
- GET /api/config
- GET /api/functions
- GET /api/interactions
- POST /api/interactions
- GET /api/feedback
- POST /api/feedback
- GET /api/analytics
- GET /api/product-readiness

## Tech Stack

- Stellar Soroban
- Rust
- soroban-sdk
- React
- TypeScript
- Vite
- Express
- Node.js
- GitHub Actions
- Vercel deployment config
- Railway deployment config

## Repository Structure

    biodiversity_seed
    â”œâ”€â”€ contracts
    â”‚   â””â”€â”€ biodiversity_seed
    â”œâ”€â”€ frontend
    â”œâ”€â”€ server
    â”œâ”€â”€ scripts
    â”œâ”€â”€ docs
    â”œâ”€â”€ .github
    â”‚   â””â”€â”€ workflows
    â”œâ”€â”€ vercel.json
    â”œâ”€â”€ railway.toml
    â”œâ”€â”€ Procfile
    â”œâ”€â”€ Cargo.toml
    â”œâ”€â”€ Cargo.lock
    â””â”€â”€ README.md

## Local Requirements

Recommended versions:

- Node.js 24.x
- npm 11.x
- Rust 1.96.x
- Cargo 1.96.x
- Stellar CLI 27.x
- Rust target wasm32v1-none

Install Rust target if needed:

    rustup target add wasm32v1-none

## Run Smart Contract Locally

From the project root:

    cargo fmt
    cargo test --workspace
    cargo build --workspace --target wasm32v1-none --release
    stellar contract build

Expected result:

- contract tests pass
- WASM release build succeeds
- Stellar contract build completes

## Run Frontend Locally

    cd frontend
    npm ci
    npm run dev

Build frontend:

    npm run type-check
    npm run build
    npm test

## Run Backend Locally

    cd server
    npm ci
    npm run dev

Build backend:

    npm run type-check
    npm run build
    npm start

Default backend URL:

    http://localhost:8787

Health check:

    http://localhost:8787/health

## Local Level 4 Verification

Run the full local verification script:

    .\scripts\verify-level4.ps1

The script checks:

- required files
- Rust formatting
- smart contract tests
- WASM release build
- Stellar contract build
- frontend install
- frontend type-check
- frontend build
- frontend tests
- backend install
- backend type-check
- backend build

## Deployment

Frontend deployment config:

    vercel.json

Backend deployment config:

    railway.toml
    Procfile

Frontend target:

- Vercel
- Netlify
- similar static hosting

Backend target:

- Railway
- Render
- similar Node.js hosting

Smart contract target:

- Stellar Testnet

## Contract Configuration

Frontend contract config is stored in:

    frontend/src/contractConfig.ts

After deploying the Soroban contract, update:

    contractId: UPDATE_AFTER_DEPLOY

with the deployed Stellar Testnet contract ID.

## Documentation

Additional docs:

- docs/ARCHITECTURE.md
- docs/QUALITY_AND_DEPLOYMENT.md

## Quality Checklist

- Custom Soroban contract logic
- Contract tests
- Frontend dashboard
- Backend API
- Loading, success, and error states
- Product feedback collection
- Analytics and monitoring section
- Wallet interaction tracking
- CI/CD workflow
- Deployment configuration
- Mobile responsive UI
- Complete README documentation

## Current Status

Local verification passed for:

- smart contract
- frontend
- backend
- docs
- deployment configuration
- CI/CD configuration

## Submission Notes

Before final submission, confirm:

- GitHub Actions latest run is green
- README is visible on GitHub
- contract deployment address is updated
- live demo link is added
- demo video link is prepared
- proof of wallet interactions is collected
- user feedback summary is prepared
- GitHub contributors are correct
