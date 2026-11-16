# Crowdfunding dApp — Frontend (Sepolia demo)

A compact React + Vite single-page app that talks to the `Crowdfunding`
contract (project root, `contracts/Crowdfunding.sol`) with ethers v6 and
MetaMask. It covers the full campaign lifecycle: connect a wallet, list
campaigns (id, title, goal, raised, funding progress, deadline / time
remaining, status, and your own contribution), create a campaign,
contribute ETH to a live campaign, withdraw as the creator once an ended
campaign has met its goal, and claim a refund as a contributor when an
ended campaign missed its goal. The withdraw / refund buttons only appear
when the connected account is actually eligible, mirroring the contract's
own checks. The create-campaign and contribute forms are validated
client-side first (non-empty title, goal and amount greater than 0,
duration greater than 0 days), so a bad value is a clear message instead
of a reverted transaction; and when the wallet is on the wrong network
the app offers a one-click "Switch to Sepolia" button
(`wallet_switchEthereumChain`) instead of only a warning.

## Setup

1. **Deploy the contract to Sepolia** from the project root:

   ```bash
   # .env with SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY — see ../.env.example
   npx hardhat run scripts/deploy.js --network sepolia
   ```

2. **Point the app at the deployment:** open `src/contract.js` and set
   `CONTRACT_ADDRESS` to the deployed address. Until this is done the address
   is a zero-address placeholder and the app shows a "contract not connected
   yet" notice instead of campaign data — there is no fake/demo data.

3. **Run the app:**

   ```bash
   npm install
   npm run dev
   ```

   Open the Vite URL (default http://localhost:5173), switch MetaMask to the
   **Sepolia** network, and connect. You will need a little Sepolia testnet
   ETH from a faucet to create campaigns or contribute.

## Files

- `src/contract.js` — contract address + ABI for `Crowdfunding`
- `src/App.jsx` — wallet connect, campaign list, create/contribute forms
- `src/main.jsx` — React entry point
