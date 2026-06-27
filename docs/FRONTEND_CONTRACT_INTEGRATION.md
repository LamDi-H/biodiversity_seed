# Frontend Contract Integration

This document records the direct frontend-to-contract mapping for the Biodiversity Seed Passport MVP.

## Runtime configuration

- Contract ID: `CBHAW3N2PUAFDLIE6E2E7G3NHUVHQXWMTOC45KR7M6REB6P3FHSAXTUA`
- Network: Stellar Testnet
- RPC URL: `https://soroban-testnet.stellar.org`
- Config file: `frontend/src/contractConfig.ts`

## Integration files

- `frontend/src/services/contract.ts` imports `@stellar/stellar-sdk`.
- `frontend/src/services/contract.ts` creates a Soroban RPC server.
- `frontend/src/services/contract.ts` builds contract operations with `new Contract(contractId).call(...)`.
- `frontend/src/services/contract.ts` prepares transactions with `server.prepareTransaction(...)`.
- `frontend/src/services/contract.ts` signs transactions with Freighter through `window.freighterApi.signTransaction(...)`.
- `frontend/src/services/contract.ts` submits transactions with `server.sendTransaction(...)`.
- `frontend/src/App.tsx` calls `submitContractAction(...)` from the contract service.

## Contract function mapping

| Smart contract function | Frontend source |
| --- | --- |
| `initialize` | `buildArgs()` and `submitContractAction()` |
| `create_seed_lot` | `buildArgs()` and `submitContractAction()` |
| `transfer_custody` | `buildArgs()` and `submitContractAction()` |
| `record_viability` | `buildArgs()` and `submitContractAction()` |
| `reserve_samples` | `buildArgs()` and `submitContractAction()` |
| `release_samples` | `buildArgs()` and `submitContractAction()` |
| `flag_risk` | `buildArgs()` and `submitContractAction()` |
| `mark_distributed` | `buildArgs()` and `submitContractAction()` |
| `get_seed_lot` | listed as read coverage in `CONTRACT_FUNCTIONS` |
| `get_custody_record` | listed as read coverage in `CONTRACT_FUNCTIONS` |
| `get_custody_count` | listed as read coverage in `CONTRACT_FUNCTIONS` |
| `get_stats` | listed as read coverage in `CONTRACT_FUNCTIONS` |
| `get_config` | listed as read coverage in `CONTRACT_FUNCTIONS` |

## Product behavior

A connected Freighter wallet builds, signs, and submits Soroban contract transactions on Stellar Testnet. The UI displays transaction status, the transaction hash, and a Stellar Expert explorer link after a successful contract call.