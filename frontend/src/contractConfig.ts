export const CONTRACT_CONFIG = {
  network: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "CBHAW3N2PUAFDLIE6E2E7G3NHUVHQXWMTOC45KR7M6REB6P3FHSAXTUA",
  projectName: "Biodiversity Seed Passport",
  repository: "https://github.com/LamDi-H/biodiversity_seed"
} as const;

export type ContractConfig = typeof CONTRACT_CONFIG;