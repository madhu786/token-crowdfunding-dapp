# Crowdfunding dApp — Frontend (Sepolia demo)

A compact React + Vite single-page app that talks to the `Crowdfunding`
contract (project root, `contracts/Crowdfunding.sol`) with ethers v6 and
MetaMask. It can connect a wallet, list campaigns (id, title, goal, raised,
deadline, status), create a campaign, and contribute ETH to a live campaign.

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
