import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  CROWDFUNDING_ABI,
  IS_PLACEHOLDER,
  SEPOLIA_CHAIN_ID,
} from "./contract.js";

const fmtEth = (wei) => ethers.formatEther(wei);
const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleString();

function progressPct(raised, goal) {
  if (goal === 0n) return 0;
  // Basis points first so small contributions still show progress honestly.
  const pct = Number((raised * 10000n) / goal) / 100;
  return Math.min(100, pct);
}

function timeRemaining(deadline) {
  const seconds = Number(deadline) - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return "Ended";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Create-campaign form
  const [title, setTitle] = useState("");
  const [goalEth, setGoalEth] = useState("");
  const [durationDays, setDurationDays] = useState("");
  // Per-campaign contribute amounts, keyed by campaign id
  const [amounts, setAmounts] = useState({});

  const loadCampaigns = useCallback(async (c, accountAddress = null) => {
    const count = Number(await c.campaignCount());
    const rows = [];
    for (let i = 0; i < count; i++) {
      const data = await c.campaigns(i);
      // The connected account's own stake in this campaign — needed to
      // decide whether a refund can be claimed and to show the user
      // what they have at risk. Zero when no account is connected.
      let myContribution = 0n;
      if (accountAddress) {
        myContribution = await c.contributions(i, accountAddress);
      }
      rows.push({
        id: i,
        creator: data.creator,
        title: data.title,
        goal: data.goal,
        deadline: data.deadline,
        raised: data.raised,
        withdrawn: data.withdrawn,
        myContribution,
      });
    }
    setCampaigns(rows);
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setStatus("MetaMask not detected — install it to use this demo.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      setWrongNetwork(network.chainId !== SEPOLIA_CHAIN_ID);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer);
      setContract(c);
      if (!IS_PLACEHOLDER) await loadCampaigns(c, address);
    } catch (err) {
      setStatus(`Connect failed: ${err.shortMessage || err.message}`);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  const runTx = async (label, fn) => {
    setBusy(true);
    setStatus(`${label} — confirm in MetaMask…`);
    try {
      const tx = await fn();
      setStatus(`${label} — waiting for confirmation (${tx.hash.slice(0, 10)}…)`);
      await tx.wait();
      setStatus(`${label} — confirmed.`);
      await loadCampaigns(contract, account);
    } catch (err) {
      setStatus(`${label} failed: ${err.shortMessage || err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Validate before any transaction is built: the contract reverts on a
  // zero goal (InvalidGoal) or zero duration (InvalidDeadline), and
  // parseEther throws on malformed input — both used to reach the user as
  // a failed transaction or an uncaught error instead of a clear message.
  const createCampaign = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatus("Create campaign failed: enter a title.");
      return;
    }
    let goal;
    try {
      goal = ethers.parseEther(goalEth);
    } catch {
      setStatus("Create campaign failed: goal must be a valid ETH amount.");
      return;
    }
    if (goal <= 0n) {
      setStatus("Create campaign failed: goal must be greater than 0 ETH.");
      return;
    }
    const days = parseFloat(durationDays);
    if (!Number.isFinite(days) || days <= 0) {
      setStatus("Create campaign failed: duration must be greater than 0 days.");
      return;
    }
    const durationSeconds = BigInt(Math.round(days * 86400));
    if (durationSeconds === 0n) {
      setStatus("Create campaign failed: duration must be greater than 0 days.");
      return;
    }
    runTx("Create campaign", () => contract.createCampaign(title.trim(), goal, durationSeconds));
  };

  // Ask MetaMask to switch to Sepolia instead of only telling the user
  // the network is wrong; switching fires chainChanged, which reloads.
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      setStatus(`Switch to Sepolia failed: ${err.shortMessage || err.message}`);
    }
  };

  const contribute = (id) => {
    let value;
    try {
      value = ethers.parseEther(amounts[id] || "");
    } catch {
      setStatus(`Contribute to #${id} failed: amount must be a valid ETH amount.`);
      return;
    }
    if (value <= 0n) {
      setStatus(`Contribute to #${id} failed: amount must be greater than 0 ETH.`);
      return;
    }
    runTx(`Contribute to #${id}`, () => contract.contribute(id, { value }));
  };

  const withdraw = (id) =>
    runTx(`Withdraw from #${id}`, () => contract.withdraw(id));

  const claimRefund = (id) =>
    runTx(`Claim refund from #${id}`, () => contract.claimRefund(id));

  const campaignState = (c) => {
    const ended = BigInt(Math.floor(Date.now() / 1000)) >= c.deadline;
    if (!ended) return "Live";
    if (c.withdrawn) return "Ended — withdrawn";
    return c.raised >= c.goal ? "Ended — goal met" : "Ended — goal missed";
  };

  const isCreator = (c) =>
    account && c.creator.toLowerCase() === account.toLowerCase();

  const canWithdraw = (c) =>
    campaignState(c) === "Ended — goal met" && isCreator(c) && !c.withdrawn;

  const canRefund = (c) =>
    campaignState(c) === "Ended — goal missed" && c.myContribution > 0n;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Crowdfunding dApp — Sepolia Demo</h1>

      {IS_PLACEHOLDER && (
        <p style={{ background: "#fff3cd", padding: "0.75rem 1rem", borderRadius: 6 }}>
          <strong>Contract not connected yet.</strong> Deploy Crowdfunding to
          Sepolia (see the project README) and set <code>CONTRACT_ADDRESS</code>{" "}
          in <code>src/contract.js</code> — until then there is no contract to
          read campaigns from or send transactions to.
        </p>
      )}

      {!account ? (
        <button onClick={connect} disabled={IS_PLACEHOLDER}>
          Connect wallet (MetaMask)
        </button>
      ) : (
        <p>
          Connected: <code>{account}</code>
          {wrongNetwork && (
            <span style={{ color: "#b00020" }}>
              {" "}— wrong network:{" "}
              <button onClick={switchToSepolia} disabled={busy}>
                Switch to Sepolia
              </button>
            </span>
          )}
        </p>
      )}

      {status && <p>{status}</p>}

      {contract && !IS_PLACEHOLDER && (
        <>
          <h2>Create a campaign</h2>
          <form onSubmit={createCampaign} style={{ display: "grid", gap: "0.5rem", maxWidth: 420 }}>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input placeholder="Goal (ETH)" type="number" step="any" min="0" value={goalEth}
              onChange={(e) => setGoalEth(e.target.value)} required />
            <input placeholder="Duration (days)" type="number" step="any" min="0" value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)} required />
            <button type="submit" disabled={busy}>Create campaign</button>
          </form>

          <h2>Campaigns</h2>
          <button onClick={() => loadCampaigns(contract, account)} disabled={busy}>Refresh</button>
          {campaigns.length === 0 && <p>No campaigns yet.</p>}
          {campaigns.map((c) => {
            const pct = progressPct(c.raised, c.goal);
            return (
              <article key={c.id} style={{ border: "1px solid #ccc", borderRadius: 6, padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
                <h3 style={{ margin: "0 0 0.25rem" }}>#{c.id} — {c.title}</h3>
                <p style={{ margin: "0.25rem 0" }}>
                  Goal: {fmtEth(c.goal)} ETH · Raised: {fmtEth(c.raised)} ETH ({pct.toFixed(1)}%)<br />
                  Deadline: {fmtDate(c.deadline)} · {timeRemaining(c.deadline)} · Status: {campaignState(c)}<br />
                  Creator: <code>{c.creator}</code>
                  {isCreator(c) && <> (you)</>}
                  {c.myContribution > 0n && (
                    <><br />Your contribution: {fmtEth(c.myContribution)} ETH</>
                  )}
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Funding progress for campaign ${c.id}`}
                  style={{ background: "#e9ecef", borderRadius: 4, height: 8, overflow: "hidden", margin: "0.5rem 0" }}
                >
                  <div style={{ background: "#2f9e44", height: "100%", width: `${pct}%` }} />
                </div>
                {campaignState(c) === "Live" && (
                  <span>
                    <input placeholder="Amount (ETH)" type="number" step="any" min="0"
                      value={amounts[c.id] || ""}
                      onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value })} />{" "}
                    <button onClick={() => contribute(c.id)} disabled={busy}>Contribute</button>
                  </span>
                )}
                {canWithdraw(c) && (
                  <button onClick={() => withdraw(c.id)} disabled={busy}>
                    Withdraw {fmtEth(c.raised)} ETH
                  </button>
                )}
                {canRefund(c) && (
                  <button onClick={() => claimRefund(c.id)} disabled={busy}>
                    Claim refund ({fmtEth(c.myContribution)} ETH)
                  </button>
                )}
              </article>
            );
          })}
        </>
      )}
    </main>
  );
}
