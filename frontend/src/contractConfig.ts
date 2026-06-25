export const CONTRACT_CONFIG = {
  network: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "UPDATE_AFTER_DEPLOY",
  projectName: "Biodiversity Seed Passport",
  repository: "https://github.com/LamDi-H/biodiversity_seed"
} as const;

export type ContractConfig = typeof CONTRACT_CONFIG;
