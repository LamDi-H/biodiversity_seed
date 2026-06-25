import { randomUUID } from "node:crypto";

export type ContractFunctionType = "read" | "write";

export type ContractFunction = {
  name: string;
  type: ContractFunctionType;
  role: string;
  description: string;
};

export type InteractionStatus = "success" | "pending" | "failed";

export type InteractionRecord = {
  id: string;
  wallet: string;
  action: string;
  status: InteractionStatus;
  txHash: string;
  timestamp: string;
};

export type FeedbackRecord = {
  id: string;
  role: string;
  score: number;
  comment: string;
  timestamp: string;
};

export type AnalyticsSummary = {
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  pendingInteractions: number;
  feedbackCount: number;
  averageFeedbackScore: number;
};

export const contractConfig = {
  projectName: "Biodiversity Seed Passport",
  network: "Stellar Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
  contractId: "UPDATE_AFTER_DEPLOY",
  repository: "https://github.com/LamDi-H/biodiversity_seed"
};

export const contractFunctions: ContractFunction[] = [
  {
    name: "initialize",
    type: "write",
    role: "Admin",
    description: "Creates platform config and initializes registry stats."
  },
  {
    name: "create_seed_lot",
    type: "write",
    role: "Seed bank custodian",
    description: "Registers a seed lot with provenance, custodian, sample count, and viability score."
  },
  {
    name: "transfer_custody",
    type: "write",
    role: "Current custodian",
    description: "Transfers seed lot custody between institutions while preserving audit history."
  },
  {
    name: "record_viability",
    type: "write",
    role: "Current custodian",
    description: "Updates seed viability score after testing or storage review."
  },
  {
    name: "reserve_samples",
    type: "write",
    role: "Researcher",
    description: "Reserves seed samples for research, restoration, or field trials."
  },
  {
    name: "release_samples",
    type: "write",
    role: "Researcher",
    description: "Returns unused samples to the available balance."
  },
  {
    name: "flag_risk",
    type: "write",
    role: "Current custodian",
    description: "Flags storage, transport, or viability risk for a seed lot."
  },
  {
    name: "mark_distributed",
    type: "write",
    role: "Current custodian",
    description: "Records seed distribution to a community bank or conservation program."
  },
  {
    name: "get_seed_lot",
    type: "read",
    role: "Viewer",
    description: "Reads seed lot metadata and availability."
  },
  {
    name: "get_custody_record",
    type: "read",
    role: "Viewer",
    description: "Reads a custody/audit record by ID."
  },
  {
    name: "get_custody_count",
    type: "read",
    role: "Viewer",
    description: "Reads total custody record count."
  },
  {
    name: "get_stats",
    type: "read",
    role: "Viewer",
    description: "Reads registry-level product stats."
  },
  {
    name: "get_config",
    type: "read",
    role: "Viewer",
    description: "Reads platform config."
  }
];

const interactions: InteractionRecord[] = [
  {
    id: "interaction-001",
    wallet: "GCL4...SEED",
    action: "create_seed_lot",
    status: "success",
    txHash: "mock-create-seed-lot",
    timestamp: new Date().toISOString()
  },
  {
    id: "interaction-002",
    wallet: "GBIO...BANK",
    action: "reserve_samples",
    status: "success",
    txHash: "mock-reserve-samples",
    timestamp: new Date().toISOString()
  },
  {
    id: "interaction-003",
    wallet: "GCON...LABS",
    action: "record_viability",
    status: "pending",
    txHash: "mock-record-viability",
    timestamp: new Date().toISOString()
  }
];

const feedback: FeedbackRecord[] = [
  {
    id: "feedback-001",
    role: "Seed bank operator",
    score: 5,
    comment: "The custody flow is clear for seed-bank operations.",
    timestamp: new Date().toISOString()
  },
  {
    id: "feedback-002",
    role: "Researcher",
    score: 4,
    comment: "Reservation and release tracking would help field trials.",
    timestamp: new Date().toISOString()
  }
];

export function getHealth() {
  return {
    ok: true,
    service: "biodiversity-seed-level4-server",
    timestamp: new Date().toISOString()
  };
}

export function getConfig() {
  return contractConfig;
}

export function getContractFunctions() {
  return contractFunctions;
}

export function getInteractions() {
  return interactions;
}

export function addInteraction(input: {
  wallet: string;
  action: string;
  status?: InteractionStatus;
  txHash?: string;
}) {
  const record: InteractionRecord = {
    id: randomUUID(),
    wallet: input.wallet || "unknown-wallet",
    action: input.action || "unknown-action",
    status: input.status ?? "success",
    txHash: input.txHash || `mock-${Date.now().toString(16)}`,
    timestamp: new Date().toISOString()
  };

  interactions.unshift(record);
  return record;
}

export function getFeedback() {
  return feedback;
}

export function addFeedback(input: {
  role: string;
  score: number;
  comment: string;
}) {
  const safeScore = Math.max(1, Math.min(5, Number(input.score) || 1));

  const record: FeedbackRecord = {
    id: randomUUID(),
    role: input.role || "User",
    score: safeScore,
    comment: input.comment || "No comment provided.",
    timestamp: new Date().toISOString()
  };

  feedback.unshift(record);
  return record;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const totalInteractions = interactions.length;
  const successfulInteractions = interactions.filter((item) => item.status === "success").length;
  const failedInteractions = interactions.filter((item) => item.status === "failed").length;
  const pendingInteractions = interactions.filter((item) => item.status === "pending").length;
  const feedbackCount = feedback.length;
  const scoreSum = feedback.reduce((sum, item) => sum + item.score, 0);

  return {
    totalInteractions,
    successfulInteractions,
    failedInteractions,
    pendingInteractions,
    feedbackCount,
    averageFeedbackScore: feedbackCount === 0 ? 0 : Number((scoreSum / feedbackCount).toFixed(2))
  };
}

export function getProductReadiness() {
  return {
    product: "Biodiversity Seed Passport",
    status: "development-ready",
    architecture: {
      smartContract: true,
      frontendDashboard: true,
      backendApi: true,
      analytics: true,
      feedbackCollection: true,
      deploymentConfig: false,
      ciCd: false
    },
    nextSteps: [
      "Add deployment configuration",
      "Add CI/CD workflow",
      "Deploy contract to Stellar Testnet",
      "Update frontend contractConfig.ts with deployed contract ID",
      "Collect wallet interactions and feedback"
    ]
  };
}
