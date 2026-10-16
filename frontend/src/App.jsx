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

  const loadCampaigns = useCallback(async (c) => {
    const count = Number(await c.campaignCount());
    const rows = [];
    for (let i = 0; i < count; i++) {
      const data = await c.campaigns(i);
      rows.push({
        id: i,
        creator: data.creator,
        title: data.title,
        goal: data.goal,
        deadline: data.deadline,
        raised: data.raised,
        withdrawn: data.withdrawn,
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
      setAccount(await signer.getAddress());
      const c = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer);
      setContract(c);
      if (!IS_PLACEHOLDER) await loadCampaigns(c);
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
      await loadCampaigns(contract);
    } catch (err) {
      setStatus(`${label} failed: ${err.shortMessage || err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const createCampaign = (e) => {
    e.preventDefault();
    const goal = ethers.parseEther(goalEth || "0");
    const durationSeconds = BigInt(Math.round(parseFloat(durationDays) * 86400));
    runTx("Create campaign", () => contract.createCampaign(title, goal, durationSeconds));
  };

  const contribute = (id) =>
    runTx(`Contribute to #${id}`, () =>
      contract.contribute(id, { value: ethers.parseEther(amounts[id] || "0") })
    );

  const campaignState = (c) => {
    const ended = BigInt(Math.floor(Date.now() / 1000)) >= c.deadline;
    if (!ended) return "Live";
    if (c.withdrawn) return "Ended — withdrawn";
    return c.raised >= c.goal ? "Ended — goal met" : "Ended — goal missed";
  };

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
              {" "}— wrong network: switch MetaMask to Sepolia.
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
          <button onClick={() => loadCampaigns(contract)} disabled={busy}>Refresh</button>
          {campaigns.length === 0 && <p>No campaigns yet.</p>}
          {campaigns.map((c) => (
            <article key={c.id} style={{ border: "1px solid #ccc", borderRadius: 6, padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
              <h3 style={{ margin: "0 0 0.25rem" }}>#{c.id} — {c.title}</h3>
              <p style={{ margin: "0.25rem 0" }}>
                Goal: {fmtEth(c.goal)} ETH · Raised: {fmtEth(c.raised)} ETH<br />
                Deadline: {fmtDate(c.deadline)} · Status: {campaignState(c)}<br />
                Creator: <code>{c.creator}</code>
              </p>
              {campaignState(c) === "Live" && (
                <span>
                  <input placeholder="Amount (ETH)" type="number" step="any" min="0"
                    value={amounts[c.id] || ""}
                    onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value })} />{" "}
                  <button onClick={() => contribute(c.id)} disabled={busy}>Contribute</button>
                </span>
              )}
            </article>
          ))}
        </>
      )}
    </main>
  );
}
