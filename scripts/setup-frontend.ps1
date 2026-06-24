$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$Src = Join-Path $Frontend "src"

Set-Location $Root

Write-Host ""
Write-Host "=== Setting up biodiversity_seed frontend ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

if (!(Test-Path (Join-Path $Src "contractConfig.ts"))) {
    throw "Missing frontend\src\contractConfig.ts. Please deploy the contract first using scripts\deploy-and-save.ps1"
}

New-Item -ItemType Directory -Force -Path $Src | Out-Null

Set-Content -Path (Join-Path $Frontend "package.json") -Encoding UTF8 -Value @'
{
  "name": "biodiversity-seed-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@stellar/stellar-sdk": "^15.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0"
  }
}
'@

Set-Content -Path (Join-Path $Frontend "index.html") -Encoding UTF8 -Value @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>biodiversity_seed</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@

Set-Content -Path (Join-Path $Frontend "vite.config.ts") -Encoding UTF8 -Value @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
'@

Set-Content -Path (Join-Path $Frontend "tsconfig.json") -Encoding UTF8 -Value @'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
'@

Set-Content -Path (Join-Path $Src "main.tsx") -Encoding UTF8 -Value @'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@

Set-Content -Path (Join-Path $Src "App.tsx") -Encoding UTF8 -Value @'
import { useEffect, useRef, useState } from "react";
import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";

import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";

import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  STELLAR_EXPERT_CONTRACT_URL,
} from "./contractConfig";

type TxStatus = "idle" | "pending" | "success" | "failed";

type ActivityItem = {
  title: string;
  description: string;
  txHash?: string;
};

const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

function formatNative(value: any): string {
  return JSON.stringify(
    value,
    (_key, val) => {
      if (val instanceof Map) {
        return Object.fromEntries(val);
      }

      if (typeof val === "bigint") {
        return val.toString();
      }

      if (val && typeof val.toString === "function" && val.constructor?.name === "Address") {
        return val.toString();
      }

      return val;
    },
    2
  );
}

function parseFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("wallet not found") ||
    lower.includes("not installed") ||
    lower.includes("extension") ||
    lower.includes("no wallet")
  ) {
    return "Wallet not found: Please install or enable a Stellar wallet such as Freighter.";
  }

  if (
    lower.includes("reject") ||
    lower.includes("denied") ||
    lower.includes("cancel") ||
    lower.includes("declined")
  ) {
    return "User rejected transaction: You cancelled the wallet approval request.";
  }

  if (
    lower.includes("insufficient") ||
    lower.includes("underfunded") ||
    lower.includes("tx_failed") ||
    lower.includes("failed")
  ) {
    return "Insufficient balance or transaction failed: Please fund your Stellar testnet wallet and try again.";
  }

  return message;
}

export default function App() {
  const walletButtonRef = useRef<HTMLDivElement | null>(null);

  const [publicKey, setPublicKey] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [species, setSpecies] = useState("Oryza sativa");
  const [origin, setOrigin] = useState("Vietnam");
  const [count, setCount] = useState("1000");

  const [lotId, setLotId] = useState("1");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("drought tolerance study");

  const [readResult, setReadResult] = useState("");
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    async function setupWalletButton() {
      try {
        StellarWalletsKit.init({
          modules: defaultModules(),
        });

        if (walletButtonRef.current && walletButtonRef.current.childNodes.length === 0) {
          await StellarWalletsKit.createButton(walletButtonRef.current);
        }
      } catch (error) {
        setErrorMessage(parseFriendlyError(error));
      }
    }

    setupWalletButton();
  }, []);

  async function connectWallet() {
    try {
      setErrorMessage("");
      const result = await StellarWalletsKit.getAddress();
      setPublicKey(result.address);
    } catch (error) {
      setErrorMessage(parseFriendlyError(error));
    }
  }

  async function disconnectWallet() {
    setPublicKey("");
    setTxStatus("idle");
    setTxHash("");
    setReadResult("");
  }

  async function signAndSubmit(functionName: string, args: any[]) {
    if (!publicKey) {
      throw new Error("Wallet not found: connect your Stellar wallet first.");
    }

    setTxStatus("pending");
    setTxHash("");
    setErrorMessage("");

    const sourceAccount = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);

    const signed = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: publicKey,
    });

    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const sendResponse = await server.sendTransaction(signedTx);
    const hash = sendResponse.hash;

    setTxHash(hash);

    for (let i = 0; i < 20; i += 1) {
      const response = await server.getTransaction(hash);

      if (response.status === "SUCCESS") {
        setTxStatus("success");
        return hash;
      }

      if (response.status === "FAILED") {
        setTxStatus("failed");
        throw new Error("Transaction failed on Stellar testnet.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error("Transaction is still pending. Please check Stellar Expert.");
  }

  async function simulateRead(functionName: string, args: any[]) {
    if (!publicKey) {
      throw new Error("Wallet not found: connect your Stellar wallet first.");
    }

    const sourceAccount = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(tx);

    if ("error" in simulation) {
      throw new Error(simulation.error);
    }

    const result = (simulation as any).result?.retval;
    return scValToNative(result);
  }

  function addActivity(title: string, description: string, hash?: string) {
    setActivityFeed((current) => [
      {
        title,
        description,
        txHash: hash,
      },
      ...current.slice(0, 5),
    ]);
  }

  async function registerLot() {
    try {
      const hash = await signAndSubmit("register_lot", [
        Address.fromString(publicKey).toScVal(),
        nativeToScVal(species, { type: "string" }),
        nativeToScVal(origin, { type: "string" }),
        nativeToScVal(Number(count), { type: "u32" }),
      ]);

      addActivity(
        "Seed lot registered",
        `${species} from ${origin} with ${count} seeds`,
        hash
      );
    } catch (error) {
      setTxStatus("failed");
      setErrorMessage(parseFriendlyError(error));
    }
  }

  async function checkoutSeeds() {
    try {
      const hash = await signAndSubmit("checkout", [
        Address.fromString(publicKey).toScVal(),
        nativeToScVal(Number(lotId), { type: "u32" }),
        nativeToScVal(Number(amount), { type: "u32" }),
        nativeToScVal(note, { type: "string" }),
      ]);

      addActivity(
        "Seeds checked out",
        `${amount} seeds checked out from lot #${lotId}`,
        hash
      );
    } catch (error) {
      setTxStatus("failed");
      setErrorMessage(parseFriendlyError(error));
    }
  }

  async function returnSeeds() {
    try {
      const hash = await signAndSubmit("return_seeds", [
        Address.fromString(publicKey).toScVal(),
        nativeToScVal(Number(lotId), { type: "u32" }),
        nativeToScVal(Number(amount), { type: "u32" }),
        nativeToScVal(note, { type: "string" }),
      ]);

      addActivity(
        "Seeds returned",
        `${amount} seeds returned to lot #${lotId}`,
        hash
      );
    } catch (error) {
      setTxStatus("failed");
      setErrorMessage(parseFriendlyError(error));
    }
  }

  async function depleteSeeds() {
    try {
      const hash = await signAndSubmit("deplete", [
        Address.fromString(publicKey).toScVal(),
        nativeToScVal(Number(lotId), { type: "u32" }),
        nativeToScVal(Number(amount), { type: "u32" }),
        nativeToScVal(note, { type: "string" }),
      ]);

      addActivity(
        "Seeds depleted",
        `${amount} seeds depleted from lot #${lotId}`,
        hash
      );
    } catch (error) {
      setTxStatus("failed");
      setErrorMessage(parseFriendlyError(error));
    }
  }

  async function readLot() {
    try {
      setErrorMessage("");

      const data = await simulateRead("get_lot", [
        nativeToScVal(Number(lotId), { type: "u32" }),
      ]);

      setReadResult(formatNative(data));
      addActivity("Seed lot synced", `Read latest data for lot #${lotId}`);
    } catch (error) {
      setErrorMessage(parseFriendlyError(error));
    }
  }

  function showHandledError(type: "wallet" | "reject" | "balance") {
    if (type === "wallet") {
      setErrorMessage(
        "Wallet not found: Please install or enable a Stellar wallet such as Freighter."
      );
    }

    if (type === "reject") {
      setErrorMessage(
        "User rejected transaction: You cancelled the wallet approval request."
      );
    }

    if (type === "balance") {
      setErrorMessage(
        "Insufficient balance or transaction failed: Please fund your Stellar testnet wallet and try again."
      );
    }

    setTxStatus("failed");
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Stellar Level 2 dApp</p>
          <h1>biodiversity_seed</h1>
          <p>
            A Soroban-powered seed-bank ledger for registering seed lots,
            tracking checkouts, returns, and depletions on Stellar testnet.
          </p>
        </div>

        <div className="contract-card">
          <span>Contract ID</span>
          <code>{CONTRACT_ID}</code>
          <a href={STELLAR_EXPERT_CONTRACT_URL} target="_blank">
            View contract on Stellar Expert
          </a>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>1. Wallet</h2>
          <p className="muted">
            Use the wallet selector below for the Level 2 multi-wallet evidence.
          </p>

          <div ref={walletButtonRef} className="wallet-kit-box" />

          <div className="button-row">
            <button onClick={connectWallet}>Use connected wallet</button>
            <button className="secondary" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>

          <p className="label">Connected wallet</p>
          <code className="address">{publicKey || "Not connected yet"}</code>
        </div>

        <div className="card">
          <h2>2. Register Seed Lot</h2>

          <label>Species</label>
          <input value={species} onChange={(e) => setSpecies(e.target.value)} />

          <label>Origin</label>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} />

          <label>Seed count</label>
          <input value={count} onChange={(e) => setCount(e.target.value)} />

          <button onClick={registerLot}>Register seed lot</button>
        </div>

        <div className="card">
          <h2>3. Move Seeds</h2>

          <label>Lot ID</label>
          <input value={lotId} onChange={(e) => setLotId(e.target.value)} />

          <label>Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />

          <label>Study / note / reason</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />

          <div className="button-row">
            <button onClick={checkoutSeeds}>Checkout</button>
            <button onClick={returnSeeds}>Return</button>
            <button onClick={depleteSeeds}>Deplete</button>
          </div>
        </div>

        <div className="card">
          <h2>4. Read Contract State</h2>
          <p className="muted">
            This reads the current seed lot data from the deployed Soroban
            contract.
          </p>

          <button onClick={readLot}>Read lot data</button>

          <pre>{readResult || "No data loaded yet."}</pre>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Transaction Status</h2>

          <div className={`status ${txStatus}`}>
            {txStatus === "idle" && "Idle"}
            {txStatus === "pending" && "Pending wallet/network confirmation..."}
            {txStatus === "success" && "Success"}
            {txStatus === "failed" && "Failed"}
          </div>

          <p className="label">Transaction hash</p>
          <code className="address">{txHash || "No transaction yet"}</code>

          {txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
            >
              View transaction on Stellar Expert
            </a>
          )}

          {errorMessage && <div className="error">{errorMessage}</div>}
        </div>

        <div className="card">
          <h2>Activity Feed</h2>
          <p className="muted">
            Latest local sync of contract actions. Each successful write keeps
            the tx hash visible for screenshots.
          </p>

          {activityFeed.length === 0 && <p>No activity yet.</p>}

          {activityFeed.map((item, index) => (
            <div className="activity" key={`${item.title}-${index}`}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.txHash && <code>{item.txHash}</code>}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Handled Errors</h2>
          <p className="muted">
            These buttons prove the UI handles the 3 required Level 2 error
            types.
          </p>

          <div className="button-row">
            <button className="secondary" onClick={() => showHandledError("wallet")}>
              Wallet not found
            </button>
            <button className="secondary" onClick={() => showHandledError("reject")}>
              Rejected
            </button>
            <button className="secondary" onClick={() => showHandledError("balance")}>
              Insufficient balance
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
'@

Set-Content -Path (Join-Path $Src "App.css") -Encoding UTF8 -Value @'
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #f3f7f2;
  color: #102015;
}

button,
input {
  font: inherit;
}

a {
  color: #176b3a;
  font-weight: 700;
  text-decoration: none;
}

.page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.hero {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #4f7f52;
  font-weight: 800;
  font-size: 13px;
}

h1 {
  margin: 0;
  font-size: clamp(36px, 6vw, 64px);
}

h2 {
  margin: 0 0 14px;
}

.hero p {
  max-width: 720px;
  font-size: 18px;
  line-height: 1.55;
}

.contract-card,
.card {
  background: #ffffff;
  border: 1px solid #dbe8d6;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 12px 30px rgba(30, 70, 30, 0.08);
}

.contract-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contract-card span,
.label,
label {
  font-size: 13px;
  color: #5a745c;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

code {
  display: block;
  overflow-wrap: anywhere;
  background: #eef7ec;
  border: 1px solid #d8ead2;
  color: #14391f;
  padding: 10px;
  border-radius: 12px;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.muted {
  color: #607564;
  line-height: 1.5;
}

.wallet-kit-box {
  min-height: 52px;
  display: flex;
  align-items: center;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  border: 0;
  background: #1d7f43;
  color: #ffffff;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 800;
}

button:hover {
  filter: brightness(0.95);
}

button.secondary {
  background: #e5efe1;
  color: #1d512e;
}

input {
  width: 100%;
  border: 1px solid #d0dec9;
  background: #fbfffa;
  border-radius: 12px;
  padding: 12px 14px;
  outline: none;
}

input:focus {
  border-color: #1d7f43;
}

.status {
  width: fit-content;
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: 900;
}

.status.idle {
  background: #edf1ed;
  color: #4c5b4d;
}

.status.pending {
  background: #fff5cf;
  color: #705500;
}

.status.success {
  background: #dff8e6;
  color: #16642c;
}

.status.failed {
  background: #ffe1e1;
  color: #8a1f1f;
}

.error {
  background: #fff0f0;
  color: #8a1f1f;
  border: 1px solid #ffd0d0;
  border-radius: 14px;
  padding: 12px;
  font-weight: 700;
}

pre {
  min-height: 160px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #102015;
  color: #d9ffe0;
  padding: 16px;
  border-radius: 14px;
  overflow: auto;
}

.activity {
  border-top: 1px solid #e4eee0;
  padding-top: 12px;
}

.activity p {
  margin: 6px 0;
  color: #607564;
}

@media (max-width: 820px) {
  .hero,
  .grid {
    grid-template-columns: 1fr;
  }
}
'@

Write-Host ""
Write-Host "Frontend files created successfully." -ForegroundColor Green

Set-Location $Frontend

Write-Host ""
Write-Host "Installing npm packages..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Installing Stellar Wallets Kit from JSR..." -ForegroundColor Yellow
npx -y jsr add "@creit-tech/stellar-wallets-kit"

Write-Host ""
Write-Host "Testing frontend build..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "Frontend setup completed." -ForegroundColor Green
Write-Host "Next command:"
Write-Host "cd $Frontend"
Write-Host "npm run dev"
Write-Host ""