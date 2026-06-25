import { useMemo, useState } from "react";
import { CONTRACT_CONFIG } from "./contractConfig";
import {
  CONTRACT_FUNCTIONS,
  MOCK_SEED_LOTS,
  getContractExplorerUrl,
  simulateContractAction,
  type ContractFunctionName
} from "./services/contract";
import {
  fetchRecentInteractions,
  fetchRegistryStats,
  submitFeedback,
  type FeedbackRecord,
  type InteractionRecord
} from "./services/api";
import { getAnalyticsEvents, getAnalyticsSummary, trackEvent } from "./services/analytics";

declare global {
  interface Window {
    freighterApi?: {
      isConnected?: () => Promise<boolean>;
      getPublicKey?: () => Promise<string>;
    };
  }
}

type WalletState = {
  connected: boolean;
  publicKey: string;
};

type UiStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
  txHash?: string;
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

function App() {
  const [wallet, setWallet] = useState<WalletState>(initialWallet);
  const [status, setStatus] = useState<UiStatus>({
    type: "idle",
    message: "Ready to connect wallet and run Seed Passport actions."
  });
  const [selectedAction, setSelectedAction] =
    useState<ContractFunctionName>("create_seed_lot");
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRole, setFeedbackRole] = useState("Seed bank operator");
  const [feedbackScore, setFeedbackScore] = useState(5);
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
    setStatus({
      type: "loading",
      message: "Checking Freighter wallet connection..."
    });

    try {
      if (!window.freighterApi) {
        setStatus({
          type: "error",
          message:
            "Wallet not found. Install Freighter or open this app in a browser with Freighter enabled."
        });
        trackEvent("wallet_not_found", { network: CONTRACT_CONFIG.network });
        return;
      }

      const isConnected = await window.freighterApi.isConnected?.();

      if (!isConnected) {
        setStatus({
          type: "error",
          message:
            "Wallet is not connected yet. Open Freighter and approve this app."
        });
        trackEvent("wallet_not_connected", { network: CONTRACT_CONFIG.network });
        return;
      }

      const publicKey = (await window.freighterApi.getPublicKey?.()) ?? "";

      setWallet({
        connected: Boolean(publicKey),
        publicKey
      });

      setStatus({
        type: "success",
        message: "Wallet connected successfully."
      });

      trackEvent("wallet_connected", {
        network: CONTRACT_CONFIG.network,
        hasPublicKey: Boolean(publicKey)
      });
    } catch {
      setStatus({
        type: "error",
        message: "User rejected wallet connection or wallet request failed."
      });
      trackEvent("wallet_connection_failed", { network: CONTRACT_CONFIG.network });
    }
  }

  function disconnectWallet() {
    setWallet(initialWallet);
    setStatus({
      type: "idle",
      message: "Wallet disconnected."
    });
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

    setStatus({
      type: "success",
      message: "Product data refreshed."
    });

    trackEvent("dashboard_data_refreshed", {
      interactions: nextInteractions.length,
      totalLots: nextStats.totalLots
    });
  }

  async function runAction() {
    if (!wallet.connected) {
      setStatus({
        type: "error",
        message: "Connect wallet before running a contract action."
      });
      trackEvent("contract_action_blocked", {
        reason: "wallet_not_connected",
        action: selectedAction
      });
      return;
    }

    setStatus({
      type: "loading",
      message: `Preparing ${selectedAction} transaction...`
    });

    try {
      const result = await simulateContractAction(selectedAction);

      setStatus({
        type: "success",
        message: result.message,
        txHash: result.txHash
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
    } catch {
      setStatus({
        type: "error",
        message:
          "Transaction failed. Check wallet balance, network, and contract config."
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
        <div className="hero-card">
          <p className="eyebrow">Production-ready seed-bank provenance</p>
          <h2>Track seed lots, custody history, viability, and distribution on Stellar.</h2>
          <p>
            This MVP helps seed banks, researchers, and conservation programs create a
            transparent audit trail for biodiversity seed collections using Soroban
            smart contracts on Stellar Testnet.
          </p>

          <div className="hero-actions">
            <button className="primary-button" onClick={refreshProductData}>
              Refresh product data
            </button>
            <a className="link-button" href={getContractExplorerUrl()} target="_blank">
              Open explorer
            </a>
          </div>
        </div>

        <div className="contract-card">
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
        </div>
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

          <label className="field-label" htmlFor="action">
            Select write action
          </label>
          <select
            id="action"
            value={selectedAction}
            onChange={(event) =>
              setSelectedAction(event.target.value as ContractFunctionName)
            }
          >
            {writeFunctions.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>

          <button className="primary-button full-width" onClick={runAction}>
            Run selected action
          </button>

          <div className={`status-box ${status.type}`}>
            <strong>{status.type.toUpperCase()}</strong>
            <p>{status.message}</p>
            {status.txHash ? <code>{status.txHash}</code> : null}
          </div>

          <div className="function-list">
            {[...writeFunctions, ...readFunctions].map((item) => (
              <div key={item.name} className="function-row">
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
            {MOCK_SEED_LOTS.map((lot) => (
              <div className="seed-card" key={lot.lotId}>
                <div>
                  <strong>{lot.accessionCode}</strong>
                  <p>{lot.species}</p>
                </div>
                <span className={`status-pill ${lot.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {lot.status}
                </span>
                <dl>
                  <div>
                    <dt>Origin</dt>
                    <dd>{lot.origin}</dd>
                  </div>
                  <div>
                    <dt>Available</dt>
                    <dd>{lot.availableSamples} / {lot.totalSamples}</dd>
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
              <p className="muted">Refresh data or run a contract action to populate interactions.</p>
            ) : (
              interactions.map((item) => (
                <div className="activity-row" key={item.id}>
                  <div>
                    <strong>{item.action}</strong>
                    <p>{item.wallet} · {item.timestamp}</p>
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
            <label className="field-label" htmlFor="role">User role</label>
            <select
              id="role"
              value={feedbackRole}
              onChange={(event) => setFeedbackRole(event.target.value)}
            >
              <option>Seed bank operator</option>
              <option>Researcher</option>
              <option>Conservation NGO</option>
              <option>Community seed bank</option>
            </select>

            <label className="field-label" htmlFor="score">Score: {feedbackScore}/5</label>
            <input
              id="score"
              type="range"
              min="1"
              max="5"
              value={feedbackScore}
              onChange={(event) => setFeedbackScore(Number(event.target.value))}
            />

            <label className="field-label" htmlFor="comment">Feedback</label>
            <textarea
              id="comment"
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
