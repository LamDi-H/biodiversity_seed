import { CONTRACT_CONFIG } from "../contractConfig";

export type ContractFunctionName =
  | "initialize"
  | "create_seed_lot"
  | "transfer_custody"
  | "record_viability"
  | "reserve_samples"
  | "release_samples"
  | "flag_risk"
  | "mark_distributed"
  | "get_seed_lot"
  | "get_custody_record"
  | "get_custody_count"
  | "get_stats"
  | "get_config";

export type ContractFunction = {
  name: ContractFunctionName;
  type: "write" | "read";
  label: string;
  description: string;
  requiredRole: string;
};

export type SeedLotView = {
  lotId: number;
  accessionCode: string;
  species: string;
  origin: string;
  totalSamples: number;
  availableSamples: number;
  custodian: string;
  status: "Active" | "Under Review" | "Risk Flagged" | "Distributed";
  viabilityScore: number;
  riskScore: number;
  updatedAt: string;
};

export type RegistryStatsView = {
  totalLots: number;
  activeLots: number;
  distributedLots: number;
  riskLots: number;
  totalSamples: number;
  availableSamples: number;
  custodyRecords: number;
};

export type ContractActionResult = {
  ok: boolean;
  functionName: ContractFunctionName;
  message: string;
  txHash: string;
  explorerUrl: string;
};

export const CONTRACT_FUNCTIONS: ContractFunction[] = [
  {
    name: "initialize",
    type: "write",
    label: "Initialize registry",
    description: "Creates the platform config and initial registry stats.",
    requiredRole: "Admin"
  },
  {
    name: "create_seed_lot",
    type: "write",
    label: "Create seed lot",
    description: "Registers a seed accession with provenance, sample count, custodian, and viability score.",
    requiredRole: "Seed bank custodian"
  },
  {
    name: "transfer_custody",
    type: "write",
    label: "Transfer custody",
    description: "Moves seed lot custody between institutions while preserving audit history.",
    requiredRole: "Current custodian"
  },
  {
    name: "record_viability",
    type: "write",
    label: "Record viability",
    description: "Updates the germination or viability score for a seed lot.",
    requiredRole: "Current custodian"
  },
  {
    name: "reserve_samples",
    type: "write",
    label: "Reserve samples",
    description: "Reserves seed samples for research, restoration, or field trials.",
    requiredRole: "Researcher"
  },
  {
    name: "release_samples",
    type: "write",
    label: "Release samples",
    description: "Returns unused samples back to the available balance.",
    requiredRole: "Researcher"
  },
  {
    name: "flag_risk",
    type: "write",
    label: "Flag risk",
    description: "Flags a seed lot for transport, viability, or storage risk.",
    requiredRole: "Current custodian"
  },
  {
    name: "mark_distributed",
    type: "write",
    label: "Mark distributed",
    description: "Records distribution to a community seed bank or conservation program.",
    requiredRole: "Current custodian"
  },
  {
    name: "get_seed_lot",
    type: "read",
    label: "Get seed lot",
    description: "Reads seed lot metadata and availability.",
    requiredRole: "Viewer"
  },
  {
    name: "get_custody_record",
    type: "read",
    label: "Get custody record",
    description: "Reads an audit record by record ID.",
    requiredRole: "Viewer"
  },
  {
    name: "get_custody_count",
    type: "read",
    label: "Get custody count",
    description: "Reads total custody record count.",
    requiredRole: "Viewer"
  },
  {
    name: "get_stats",
    type: "read",
    label: "Get registry stats",
    description: "Reads aggregated registry metrics.",
    requiredRole: "Viewer"
  },
  {
    name: "get_config",
    type: "read",
    label: "Get config",
    description: "Reads platform admin and institution config.",
    requiredRole: "Viewer"
  }
];

export const MOCK_STATS: RegistryStatsView = {
  totalLots: 18,
  activeLots: 14,
  distributedLots: 2,
  riskLots: 2,
  totalSamples: 12840,
  availableSamples: 9310,
  custodyRecords: 57
};

export const MOCK_SEED_LOTS: SeedLotView[] = [
  {
    lotId: 1,
    accessionCode: "VN-RICE-001",
    species: "Oryza sativa",
    origin: "Mekong Delta",
    totalSamples: 1000,
    availableSamples: 820,
    custodian: "Vietnam Seed Bank",
    status: "Active",
    viabilityScore: 92,
    riskScore: 0,
    updatedAt: "Today"
  },
  {
    lotId: 2,
    accessionCode: "VN-HERB-019",
    species: "Medicinal herb",
    origin: "Sa Pa",
    totalSamples: 460,
    availableSamples: 460,
    custodian: "Northern Research Lab",
    status: "Under Review",
    viabilityScore: 45,
    riskScore: 0,
    updatedAt: "Yesterday"
  },
  {
    lotId: 3,
    accessionCode: "VN-WILD-011",
    species: "Wild native grass",
    origin: "Ninh Thuan",
    totalSamples: 220,
    availableSamples: 190,
    custodian: "Coastal Conservation Hub",
    status: "Risk Flagged",
    viabilityScore: 70,
    riskScore: 65,
    updatedAt: "2 days ago"
  }
];

export function getContractExplorerUrl(): string {
  if (CONTRACT_CONFIG.contractId === "UPDATE_AFTER_DEPLOY") {
    return CONTRACT_CONFIG.explorerBaseUrl;
  }

  return `${CONTRACT_CONFIG.explorerBaseUrl}/contract/${CONTRACT_CONFIG.contractId}`;
}

export async function simulateContractAction(
  functionName: ContractFunctionName
): Promise<ContractActionResult> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  const txHash = `mock-${functionName}-${Date.now().toString(16)}`;

  return {
    ok: true,
    functionName,
    message: `${functionName} prepared successfully for Stellar Testnet flow.`,
    txHash,
    explorerUrl: `${CONTRACT_CONFIG.explorerBaseUrl}/tx/${txHash}`
  };
}
