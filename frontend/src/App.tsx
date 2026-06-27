import { useMemo, useState } from "react";
import "./App.css";
import { CONTRACT_CONFIG } from "./contractConfig";
import {
  CONTRACT_FUNCTIONS,
  DEMO_SEED_LOTS,
  getContractExplorerUrl,
  submitContractAction,
  type ContractActionInput,
  type WriteContractFunctionName
} from "./services/contract";
import {
  fetchRecentInteractions,
  fetchRegistryStats,
  submitFeedback,
  type FeedbackRecord,
  type InteractionRecord
} from "./services/api";
import { getAnalyticsEvents, getAnalyticsSummary, trackEvent } from "./services/analytics";

type WalletState = {
  connected: boolean;
  publicKey: string;
};

type UiStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
  txHash?: string;
  explorerUrl?: string;
};

const initialWallet: WalletState = {
  connected: false,
  publicKey: ""
};

function shortenAddress(value: string) {
  if (!value) {
    return "Not connected";
  }

  if (value.length < 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function normalizeWalletResult(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const candidate = value as { address?: string; publicKey?: string };
    return candidate.address ?? candidate.publicKey ?? "";
  }

  return "";
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function App() {
  const [wallet, setWallet] = useState(initialWallet);
  const [status, setStatus] = useState<UiStatus>({
    type: "idle",
    message: "Ready to connect wallet and run Biodiversity Seed Passport contract actions."
  });
  const [selectedAction, setSelectedAction] =
    useState<WriteContractFunctionName>("create_seed_lot");
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRole, setFeedbackRole] = useState("Seed bank operator");
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [lotId, setLotId] = useState(1);
  const [amount, setAmount] = useState(10);
  const [viabilityScore, setViabilityScore] = useState(92);
  const [riskScore, setRiskScore] = useState(40);
  const [newCustodian, setNewCustodian] = useState("");
  const [note, setNote] = useState("Dashboard validation action");
  const [stats, setStats] = useState({
    totalLots: 18,
    activeLots: 14,
    distributedLots: 2,
    riskLots: 2,
    totalSamples: 12840,
    availableSamples: 9310,
    custodyRecords: 57
  });

  const writeFunctions = useMemo(
    () => CONTRACT_FUNCTIONS.filter((item) => item.type === "write"),
    []
  );

  const readFunctions = useMemo(
    () => CONTRACT_FUNCTIONS.filter((item) => item.type === "read"),
    []
  );

  const analyticsSummary = getAnalyticsSummary();
  const analyticsEvents = getAnalyticsEvents();

  async function connectWallet() {
    setStatus({ type: "loading", message: "Checking Freighter wallet connection..." });

    try {
      if (!window.freighterApi) {
        setStatus({
          type: "error",
          message: "Freighter wallet was not found. Install or enable Freighter, then try again."
        });
        trackEvent("wallet_not_found", { network: CONTRACT_CONFIG.network });
        return;
      }

      const requestedAccess = await window.freighterApi.requestAccess?.();
      const publicKey =
        normalizeWalletResult(requestedAccess) ||
        normalizeWalletResult(await window.freighterApi.getPublicKey?.());

      if (!publicKey) {
        setStatus({
          type: "error",
          message: "Wallet connection was not approved. Open Freighter and approve this app."
        });
        trackEvent("wallet_not_connected", { network: CONTRACT_CONFIG.network });
        return;
      }

      setWallet({ connected: true, publicKey });
      setStatus({ type: "success", message: "Wallet connected successfully." });
      trackEvent("wallet_connected", {
        network: CONTRACT_CONFIG.network,
        hasPublicKey: true
      });
    } catch {
      setStatus({
        type: "error",
        message: "User rejected wallet connection or the wallet request failed."
      });
      trackEvent("wallet_connection_failed", { network: CONTRACT_CONFIG.network });
    }
  }

  function disconnectWallet() {
    setWallet(initialWallet);
    setStatus({ type: "idle", message: "Wallet disconnected." });
    trackEvent("wallet_disconnected", {});
  }

  async function refreshProductData() {
    setStatus({
      type: "loading",
      message: "Refreshing registry stats and wallet interaction data..."
    });

    const [nextStats, nextInteractions] = await Promise.all([
      fetchRegistryStats(),
      fetchRecentInteractions()
    ]);

    setStats(nextStats);
    setInteractions(nextInteractions);
    setStatus({ type: "success", message: "Product data refreshed." });

    trackEvent("dashboard_data_refreshed", {
      interactions: nextInteractions.length,
      totalLots: nextStats.totalLots
    });
  }

  function buildActionInput(): ContractActionInput {
    return {
      functionName: selectedAction,
      publicKey: wallet.publicKey,
      accessionCode: `VN-SEED-${Date.now().toString().slice(-6)}`,
      species: "Oryza sativa",
      origin: "Mekong Delta",
      totalSamples: 100,
      viabilityScore,
      riskScore,
      lotId,
      amount,
      newCustodian,
      note
    };
  }

  async function runAction() {
    if (!wallet.connected) {
      setStatus({
        type: "error",
        message: "Connect Freighter before running a contract action."
      });
      trackEvent("contract_action_blocked", {
        reason: "wallet_not_connected",
        action: selectedAction
      });
      return;
    }

    setStatus({
      type: "loading",
      message: `Preparing and submitting ${selectedAction} on Stellar Testnet...`
    });

    try {
      const result = await submitContractAction(buildActionInput());

      setStatus({
        type: "success",
        message: result.message,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl
      });

      setInteractions((current) => [
        {
          id: result.txHash,
          wallet: shortenAddress(wallet.publicKey),
          action: result.functionName,
          status: "success",
          timestamp: "just now",
          txHash: result.txHash
        },
        ...current
      ]);

      trackEvent("contract_action_success", {
        action: selectedAction,
        network: CONTRACT_CONFIG.network
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown contract transaction error.";

      setStatus({
        type: "error",
        message: `Transaction failed. ${message}`
      });

      trackEvent("contract_action_failed", {
        action: selectedAction,
        network: CONTRACT_CONFIG.network
      });
    }
  }

  async function sendFeedback() {
    if (!feedbackComment.trim()) {
      setStatus({
        type: "error",
        message: "Please enter user feedback before submitting."
      });
      return;
    }

    const record = await submitFeedback({
      role: feedbackRole,
      score: feedbackScore,
      comment: feedbackComment.trim()
    });

    setFeedback((current) => [record, ...current]);
    setFeedbackComment("");
    setStatus({
      type: "success",
      message: "Feedback saved for Level 4 product validation summary."
    });

    trackEvent("feedback_submitted", {
      role: feedbackRole,
      score: feedbackScore
    });
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Stellar Soroban Level 4 MVP</p>
          <h1>Biodiversity Seed Passport</h1>
        </div>

        <div className="wallet-card">
          <span>{shortenAddress(wallet.publicKey)}</span>
          {wallet.connected ? (
            <button className="secondary-button" onClick={disconnectWallet}>
              Disconnect
            </button>
          ) : (
            <button className="primary-button" onClick={connectWallet}>
              Connect wallet
            </button>
          )}
        </div>
      </nav>

      <section className="hero-grid">
        <article className="hero-card">
          <p className="eyebrow">Production-ready seed-bank provenance</p>
          <h2>Track seed lots, custody history, viability, and distribution on Stellar.</h2>
          <p>
            This MVP helps seed banks, researchers, and conservation programs create a
            transparent audit trail for biodiversity seed collections using Soroban smart
            contracts on Stellar Testnet.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={refreshProductData}>
              Refresh product data
            </button>
            <a className="link-button" href={getContractExplorerUrl()} target="_blank" rel="noreferrer">
              Open contract explorer
            </a>
          </div>
        </article>

        <aside className="contract-card">
          <p className="eyebrow">Contract runtime</p>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>{CONTRACT_CONFIG.network}</dd>
            </div>
            <div>
              <dt>Contract ID</dt>
              <dd>{CONTRACT_CONFIG.contractId}</dd>
            </div>
            <div>
              <dt>RPC</dt>
              <dd>{CONTRACT_CONFIG.rpcUrl}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="metrics-grid">
        <article>
          <span>Total lots</span>
          <strong>{stats.totalLots}</strong>
        </article>
        <article>
          <span>Available samples</span>
          <strong>{stats.availableSamples.toLocaleString()}</strong>
        </article>
        <article>
          <span>Custody records</span>
          <strong>{stats.custodyRecords}</strong>
        </article>
        <article>
          <span>Risk lots</span>
          <strong>{stats.riskLots}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Contract actions</p>
              <h3>Function coverage</h3>
            </div>
            <span className="pill">{CONTRACT_FUNCTIONS.length} functions</span>
          </div>

          <label className="field-label" htmlFor="contract-action">
            Select write action
          </label>
          <select
            id="contract-action"
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value as WriteContractFunctionName)}
          >
            {writeFunctions.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="lot-id">
            Lot ID
          </label>
          <input
            id="lot-id"
            type="number"
            min="1"
            value={lotId}
            onChange={(event) => setLotId(Number(event.target.value))}
          />

          <label className="field-label" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />

          <label className="field-label" htmlFor="viability-score">
            Viability score: {viabilityScore}
          </label>
          <input
            id="viability-score"
            type="range"
            min="0"
            max="100"
            value={viabilityScore}
            onChange={(event) => setViabilityScore(Number(event.target.value))}
          />

          <label className="field-label" htmlFor="risk-score">
            Risk score: {riskScore}
          </label>
          <input
            id="risk-score"
            type="range"
            min="0"
            max="100"
            value={riskScore}
            onChange={(event) => setRiskScore(Number(event.target.value))}
          />

          <label className="field-label" htmlFor="new-custodian">
            New custodian address
          </label>
          <input
            id="new-custodian"
            value={newCustodian}
            placeholder="Optional, defaults to connected wallet"
            onChange={(event) => setNewCustodian(event.target.value)}
          />

          <label className="field-label" htmlFor="action-note">
            Action note
          </label>
          <textarea
            id="action-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <button className="primary-button full-width" onClick={runAction}>
            Run selected action
          </button>

          <div className={`status-box ${status.type}`}>
            <strong>{status.type.toUpperCase()}</strong>
            <p>{status.message}</p>
            {status.txHash ? <code>{status.txHash}</code> : null}
            {status.explorerUrl ? (
              <a className="link-button" href={status.explorerUrl} target="_blank" rel="noreferrer">
                View transaction
              </a>
            ) : null}
          </div>

          <div className="function-list">
            {[...writeFunctions, ...readFunctions].map((item) => (
              <div className="function-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                </div>
                <span>{item.type}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Seed lots</p>
              <h3>Registry dashboard</h3>
            </div>
            <span className="pill">mobile ready</span>
          </div>

          <div className="seed-list">
            {DEMO_SEED_LOTS.map((lot) => (
              <div className="seed-card" key={lot.lotId}>
                <div>
                  <strong>{lot.accessionCode}</strong>
                  <p>{lot.species}</p>
                </div>
                <span className={`status-pill ${statusClass(lot.status)}`}>{lot.status}</span>

                <dl>
                  <div>
                    <dt>Origin</dt>
                    <dd>{lot.origin}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>
                      {lot.availableSamples} / {lot.totalSamples}
                    </dd>
                  </div>
                  <div>
                    <dt>Viability</dt>
                    <dd>{lot.viabilityScore}%</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">User onboarding</p>
              <h3>Wallet interaction proof</h3>
            </div>
            <span className="pill">{interactions.length} records</span>
          </div>

          <div className="activity-list">
            {interactions.length === 0 ? (
              <p className="muted">Run a real contract action to populate wallet interactions.</p>
            ) : (
              interactions.map((item) => (
                <div className="activity-row" key={item.id}>
                  <div>
                    <strong>{item.action}</strong>
                    <p>
                      {item.wallet} Â· {item.timestamp}
                    </p>
                    <code>{item.txHash}</code>
                  </div>
                  <span>{item.status}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Product validation</p>
              <h3>User feedback</h3>
            </div>
            <span className="pill">{feedback.length} feedback</span>
          </div>

          <div className="feedback-form">
            <label className="field-label" htmlFor="feedback-role">
              User role
            </label>
            <select
              id="feedback-role"
              value={feedbackRole}
              onChange={(event) => setFeedbackRole(event.target.value)}
            >
              <option>Seed bank operator</option>
              <option>Researcher</option>
              <option>Conservation NGO</option>
              <option>Community seed bank</option>
            </select>

            <label className="field-label" htmlFor="feedback-score">
              Score: {feedbackScore}/5
            </label>
            <input
              id="feedback-score"
              type="range"
              min="1"
              max="5"
              value={feedbackScore}
              onChange={(event) => setFeedbackScore(Number(event.target.value))}
            />

            <label className="field-label" htmlFor="feedback-comment">
              Feedback
            </label>
            <textarea
              id="feedback-comment"
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              placeholder="Example: the custody flow is clear for our seed bank team..."
            />

            <button className="primary-button full-width" onClick={sendFeedback}>
              Save feedback
            </button>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Monitoring</p>
              <h3>Analytics summary</h3>
            </div>
            <span className="pill">local telemetry</span>
          </div>

          <div className="metrics-grid compact">
            <article>
              <span>Events</span>
              <strong>{analyticsSummary.trackedEvents}</strong>
            </article>
            <article>
              <span>Wallet</span>
              <strong>{analyticsSummary.walletInteractions}</strong>
            </article>
            <article>
              <span>Contract</span>
              <strong>{analyticsSummary.contractActions}</strong>
            </article>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h3>Analytics events</h3>
            </div>
          </div>

          <div className="activity-list">
            {analyticsEvents.length === 0 ? (
              <p className="muted">No analytics events yet.</p>
            ) : (
              analyticsEvents.slice(0, 5).map((event) => (
                <div className="activity-row" key={`${event.name}-${event.timestamp}`}>
                  <div>
                    <strong>{event.name}</strong>
                    <p>{event.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;