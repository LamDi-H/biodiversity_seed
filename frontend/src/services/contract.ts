import * as StellarSdk from "@stellar/stellar-sdk";
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

export type WriteContractFunctionName =
  | "initialize"
  | "create_seed_lot"
  | "transfer_custody"
  | "record_viability"
  | "reserve_samples"
  | "release_samples"
  | "flag_risk"
  | "mark_distributed";

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

export type ContractActionInput = {
  functionName: WriteContractFunctionName;
  publicKey: string;
  accessionCode: string;
  species: string;
  origin: string;
  totalSamples: number;
  viabilityScore: number;
  riskScore: number;
  lotId: number;
  amount: number;
  newCustodian: string;
  note: string;
};

export type ContractActionResult = {
  ok: boolean;
  functionName: WriteContractFunctionName;
  message: string;
  txHash: string;
  explorerUrl: string;
};

type TransactionBuilderInstance = {
  addOperation: (operation: unknown) => TransactionBuilderInstance;
  setTimeout: (seconds: number) => TransactionBuilderInstance;
  build: () => unknown;
};

type TransactionBuilderConstructor = {
  new (
    account: unknown,
    options: { fee: string; networkPassphrase: string }
  ): TransactionBuilderInstance;
  fromXDR: (xdr: string, networkPassphrase: string) => unknown;
};

type RpcServer = {
  getAccount: (publicKey: string) => Promise<unknown>;
  prepareTransaction: (transaction: unknown) => Promise<{ toXDR: () => string }>;
  sendTransaction: (transaction: unknown) => Promise<{
    hash: string;
    status?: string;
    errorResult?: unknown;
  }>;
  getTransaction: (hash: string) => Promise<{
    status: string;
  }>;
};

type StellarLike = {
  BASE_FEE: string | number;
  Contract: new (contractId: string) => {
    call: (method: string, ...args: unknown[]) => unknown;
  };
  Address: {
    fromString: (value: string) => { toScVal: () => unknown };
  };
  TransactionBuilder: TransactionBuilderConstructor;
  nativeToScVal: (value: unknown, options?: unknown) => unknown;
  rpc?: { Server: new (url: string, options?: { allowHttp?: boolean }) => RpcServer };
  SorobanRpc?: { Server: new (url: string, options?: { allowHttp?: boolean }) => RpcServer };
};

type FreighterSignResult = string | { signedTxXdr?: string; signedXDR?: string };

type FreighterApi = {
  isConnected?: () => Promise<boolean | { isConnected?: boolean }>;
  requestAccess?: () => Promise<string | { address?: string; publicKey?: string }>;
  getPublicKey?: () => Promise<string | { address?: string; publicKey?: string }>;
  signTransaction: (
    xdr: string,
    options: { networkPassphrase: string; address?: string; network?: string }
  ) => Promise<FreighterSignResult>;
};

declare global {
  interface Window {
    freighterApi?: FreighterApi;
  }
}

export const CONTRACT_FUNCTIONS: ContractFunction[] = [
  {
    name: "initialize",
    type: "write",
    label: "Initialize registry",
    description: "Calls initialize(admin, institution) to create platform config and initial registry stats.",
    requiredRole: "Admin"
  },
  {
    name: "create_seed_lot",
    type: "write",
    label: "Create seed lot",
    description: "Calls create_seed_lot(custodian, accession_code, species, origin, total_samples, viability_score).",
    requiredRole: "Seed bank custodian"
  },
  {
    name: "transfer_custody",
    type: "write",
    label: "Transfer custody",
    description: "Calls transfer_custody(current_custodian, new_custodian, lot_id, note).",
    requiredRole: "Current custodian"
  },
  {
    name: "record_viability",
    type: "write",
    label: "Record viability",
    description: "Calls record_viability(custodian, lot_id, viability_score, note).",
    requiredRole: "Current custodian"
  },
  {
    name: "reserve_samples",
    type: "write",
    label: "Reserve samples",
    description: "Calls reserve_samples(researcher, lot_id, amount, purpose).",
    requiredRole: "Researcher"
  },
  {
    name: "release_samples",
    type: "write",
    label: "Release samples",
    description: "Calls release_samples(researcher, lot_id, amount, note).",
    requiredRole: "Researcher"
  },
  {
    name: "flag_risk",
    type: "write",
    label: "Flag risk",
    description: "Calls flag_risk(custodian, lot_id, risk_score, reason).",
    requiredRole: "Current custodian"
  },
  {
    name: "mark_distributed",
    type: "write",
    label: "Mark distributed",
    description: "Calls mark_distributed(custodian, lot_id, amount, recipient_note).",
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

export const DEFAULT_STATS: RegistryStatsView = {
  totalLots: 18,
  activeLots: 14,
  distributedLots: 2,
  riskLots: 2,
  totalSamples: 12840,
  availableSamples: 9310,
  custodyRecords: 57
};

export const DEMO_SEED_LOTS: SeedLotView[] = [
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

function sdk(): StellarLike {
  return StellarSdk as unknown as StellarLike;
}

function rpcServer(): RpcServer {
  const currentSdk = sdk();
  const RpcNamespace = currentSdk.rpc ?? currentSdk.SorobanRpc;

  if (!RpcNamespace) {
    throw new Error("Soroban RPC is not available from @stellar/stellar-sdk.");
  }

  return new RpcNamespace.Server(CONTRACT_CONFIG.rpcUrl, { allowHttp: false });
}

function address(value: string): unknown {
  return sdk().Address.fromString(value).toScVal();
}

function str(value: string): unknown {
  return sdk().nativeToScVal(value, { type: "string" });
}

function u32(value: number): unknown {
  return sdk().nativeToScVal(Math.max(0, Math.trunc(value)), { type: "u32" });
}

function getFreighter(): FreighterApi {
  if (!window.freighterApi) {
    throw new Error("Freighter wallet was not found in this browser.");
  }

  return window.freighterApi;
}

function normalizeSignedXdr(result: FreighterSignResult): string {
  if (typeof result === "string") {
    return result;
  }

  if (result.signedTxXdr) {
    return result.signedTxXdr;
  }

  if (result.signedXDR) {
    return result.signedXDR;
  }

  throw new Error("Freighter did not return a signed transaction XDR.");
}

function buildArgs(input: ContractActionInput): unknown[] {
  const actor = input.publicKey;
  const note = input.note || "Biodiversity Seed Passport dashboard action";

  switch (input.functionName) {
    case "initialize":
      return [address(actor), str("Biodiversity Seed Passport MVP")];

    case "create_seed_lot":
      return [
        address(actor),
        str(input.accessionCode),
        str(input.species),
        str(input.origin),
        u32(input.totalSamples),
        u32(input.viabilityScore)
      ];

    case "transfer_custody":
      return [address(actor), address(input.newCustodian || actor), u32(input.lotId), str(note)];

    case "record_viability":
      return [address(actor), u32(input.lotId), u32(input.viabilityScore), str(note)];

    case "reserve_samples":
      return [address(actor), u32(input.lotId), u32(input.amount), str(note)];

    case "release_samples":
      return [address(actor), u32(input.lotId), u32(input.amount), str(note)];

    case "flag_risk":
      return [address(actor), u32(input.lotId), u32(input.riskScore), str(note)];

    case "mark_distributed":
      return [address(actor), u32(input.lotId), u32(input.amount), str(note)];
  }
}

async function waitForTransaction(server: RpcServer, hash: string): Promise<void> {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const response = await server.getTransaction(hash);

    if (response.status === "SUCCESS") {
      return;
    }

    if (response.status === "FAILED") {
      throw new Error(`Contract transaction failed on Stellar Testnet: ${hash}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

export function getContractExplorerUrl(): string {
  if (!CONTRACT_CONFIG.contractId) {
    return CONTRACT_CONFIG.explorerBaseUrl;
  }

  return `${CONTRACT_CONFIG.explorerBaseUrl}/contract/${CONTRACT_CONFIG.contractId}`;
}

export function getTransactionExplorerUrl(txHash: string): string {
  return `${CONTRACT_CONFIG.explorerBaseUrl}/tx/${txHash}`;
}

export function buildContractOperation(input: ContractActionInput): unknown {
  const contract = new (sdk().Contract)(CONTRACT_CONFIG.contractId);
  return contract.call(input.functionName, ...buildArgs(input));
}

export async function submitContractAction(input: ContractActionInput): Promise<ContractActionResult> {
  if (!CONTRACT_CONFIG.contractId) {
    throw new Error("Missing deployed contract ID in frontend/src/contractConfig.ts.");
  }

  const currentSdk = sdk();
  const server = rpcServer();
  const operation = buildContractOperation(input);
  const sourceAccount = await server.getAccount(input.publicKey);

  const transaction = new currentSdk.TransactionBuilder(sourceAccount, {
    fee: String(currentSdk.BASE_FEE),
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const preparedTransaction = await server.prepareTransaction(transaction);

  const signed = await getFreighter().signTransaction(preparedTransaction.toXDR(), {
    network: "TESTNET",
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
    address: input.publicKey
  });

  const signedTransaction = currentSdk.TransactionBuilder.fromXDR(
    normalizeSignedXdr(signed),
    CONTRACT_CONFIG.networkPassphrase
  );

  const sendResponse = await server.sendTransaction(signedTransaction);

  if (sendResponse.status === "ERROR") {
    throw new Error(`Stellar transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  await waitForTransaction(server, sendResponse.hash);

  return {
    ok: true,
    functionName: input.functionName,
    message: `${input.functionName} was submitted to the BiodiversitySeed Soroban contract on Stellar Testnet.`,
    txHash: sendResponse.hash,
    explorerUrl: getTransactionExplorerUrl(sendResponse.hash)
  };
}