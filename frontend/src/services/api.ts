import { CONTRACT_FUNCTIONS, MOCK_STATS, type RegistryStatsView } from "./contract";

export type InteractionRecord = {
  id: string;
  wallet: string;
  action: string;
  status: "success" | "pending" | "failed";
  timestamp: string;
  txHash: string;
};

export type FeedbackRecord = {
  id: string;
  role: string;
  score: number;
  comment: string;
  timestamp: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export async function fetchRegistryStats(): Promise<RegistryStatsView> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);

    if (!response.ok) {
      return MOCK_STATS;
    }

    await response.json();
    return MOCK_STATS;
  } catch {
    return MOCK_STATS;
  }
}

export async function fetchFunctionCoverage() {
  return CONTRACT_FUNCTIONS;
}

export async function fetchRecentInteractions(): Promise<InteractionRecord[]> {
  return [
    {
      id: "interaction-001",
      wallet: "GCL4...SEED",
      action: "create_seed_lot",
      status: "success",
      timestamp: "2 minutes ago",
      txHash: "mock-create-seed-lot"
    },
    {
      id: "interaction-002",
      wallet: "GBIO...BANK",
      action: "reserve_samples",
      status: "success",
      timestamp: "18 minutes ago",
      txHash: "mock-reserve-samples"
    },
    {
      id: "interaction-003",
      wallet: "GCON...LABS",
      action: "record_viability",
      status: "pending",
      timestamp: "32 minutes ago",
      txHash: "mock-record-viability"
    }
  ];
}

export async function submitFeedback(record: Omit<FeedbackRecord, "id" | "timestamp">) {
  return {
    ...record,
    id: `feedback-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}
