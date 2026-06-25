# Biodiversity Seed Passport Architecture

## Overview

Biodiversity Seed Passport is a production-ready Stellar Soroban MVP for seed-bank provenance, custody tracking, viability monitoring, and biodiversity preservation.

The application helps seed banks, research labs, conservation NGOs, and community seed programs track seed lots through a transparent on-chain audit trail.

## Problem

Seed banks and conservation programs often manage seed accessions, custody transfers, viability results, and distribution records across spreadsheets or siloed private systems.

This creates problems such as weak traceability, unclear custody history, hard-to-verify seed sample movement, limited transparency, and difficult reporting for biodiversity programs.

## Solution

The project provides a Stellar-based seed passport system where each seed lot can be registered, tracked, reviewed, reserved, transferred, flagged for risk, and marked as distributed.

## Why Stellar

Stellar is a strong fit because this product needs low-cost, transparent, and verifiable records for real-world provenance.

Soroban smart contracts provide custody logic, audit records, public verification, and a practical path from MVP to institutional pilot.

## System Architecture

User / Seed Bank Operator / Researcher
  -> React Frontend Dashboard
  -> Backend API
  -> Soroban Smart Contract on Stellar Testnet

## Smart Contract Layer

Location: contracts/biodiversity_seed

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

## Frontend Layer

Location: frontend

The frontend is a React + Vite dashboard with wallet connection, contract action workspace, transaction status, registry metrics, seed lot cards, feedback collection, analytics, and responsive layout.

Important files:
- frontend/src/App.tsx
- frontend/src/App.css
- frontend/src/contractConfig.ts
- frontend/src/services/contract.ts
- frontend/src/services/api.ts
- frontend/src/services/analytics.ts

## Backend Layer

Location: server

The backend is an Express API for health checks, runtime config, function coverage, wallet interactions, feedback, analytics, and product readiness.

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

## Deployment Architecture

Frontend target: Vercel, Netlify, or similar static hosting.

Backend target: Railway, Render, or similar Node.js hosting.

Smart contract target: Stellar Testnet.

## Repository Structure

- contracts/biodiversity_seed
- frontend
- server
- scripts
- docs
- .github/workflows
- vercel.json
- railway.toml
- Procfile
- README.md
