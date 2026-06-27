import { CONTRACT_FUNCTIONS, DEFAULT_STATS, type RegistryStatsView } from "./contract";

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    return "";
  }

  return `${API_BASE_URL}${path}`;
}

function isRegistryStatsView(value: unknown): value is RegistryStatsView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RegistryStatsView>;

  return (
    typeof candidate.totalLots === "number" &&
    typeof candidate.activeLots === "number" &&
    typeof candidate.distributedLots === "number" &&
    typeof candidate.riskLots === "number" &&
    typeof candidate.totalSamples === "number" &&
    typeof candidate.availableSamples === "number" &&
    typeof candidate.custodyRecords === "number"
  );
}

function isInteractionRecord(value: unknown): value is InteractionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<InteractionRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.wallet === "string" &&
    typeof candidate.action === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.txHash === "string"
  );
}

export async function fetchRegistryStats(): Promise<RegistryStatsView> {
  const url = apiUrl("/api/analytics");

  if (!url) {
    return DEFAULT_STATS;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return DEFAULT_STATS;
    }

    const payload = await response.json();

    if (isRegistryStatsView(payload)) {
      return payload;
    }

    if (isRegistryStatsView(payload.registryStats)) {
      return payload.registryStats;
    }

    return DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function fetchFunctionCoverage() {
  return CONTRACT_FUNCTIONS;
}

export async function fetchRecentInteractions(): Promise<InteractionRecord[]> {
  const url = apiUrl("/api/interactions");

  if (!url) {
    return [];
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const records = Array.isArray(payload) ? payload : payload.interactions;

    if (!Array.isArray(records)) {
      return [];
    }

    return records.filter(isInteractionRecord);
  } catch {
    return [];
  }
}

export async function submitFeedback(record: Omit<FeedbackRecord, "id" | "timestamp">) {
  const savedRecord: FeedbackRecord = {
    ...record,
    id: `feedback-${Date.now()}`,
    timestamp: new Date().toISOString()
  };

  const url = apiUrl("/api/feedback");

  if (!url) {
    return savedRecord;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(savedRecord)
    });
  } catch {
    return savedRecord;
  }

  return savedRecord;
}