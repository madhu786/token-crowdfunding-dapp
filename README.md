# Token Crowdfunding dApp (Solidity + Hardhat)

[![test](https://github.com/madhu786/token-crowdfunding-dapp/actions/workflows/test.yml/badge.svg)](https://github.com/madhu786/token-crowdfunding-dapp/actions/workflows/test.yml)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity) ![Hardhat](https://img.shields.io/badge/Hardhat-2.x-666666?logo=hardhat) ![Ethers.js](https://img.shields.io/badge/Ethers.js-v6-3C3C3D) ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs)

A small, self-contained **all-or-nothing crowdfunding smart contract** written in
Solidity, with a Hardhat test suite. This is a portfolio implementation built to
demonstrate smart-contract design, state management, and safe ETH handling
patterns — it is not a production deployment.

## What it does

- Anyone can create a campaign with a title, an ETH funding goal, and a deadline.
- Contributors send ETH to a campaign while it is live.
- When the deadline passes:
  - **Goal met** → the campaign creator withdraws the full raised amount.
  - **Goal missed** → each contributor claims their own refund.

## Features

- Campaign creation with goal + deadline validation
- Per-contributor contribution accounting (mapping-based)
- Pull-pattern refunds (no loops over contributors, no push payments)
- Custom errors instead of string reverts (gas-efficient, testable)
- Full event log: `CampaignCreated`, `Contributed`, `Withdrawn`, `Refunded`

## Contract design notes

### State machine

Each campaign moves through a simple lifecycle driven by time and totals:

```
        createCampaign
              │
              ▼
   LIVE (now < deadline) ── contribute() ──► LIVE (raised grows)
              │
        deadline passes
         ┌────┴─────────────────┐
         ▼                      ▼
  raised >= goal           raised < goal
  creator withdraw()       contributors claimRefund()
```

There is no stored "status" field to keep in sync — the state is derived from
`block.timestamp`, `raised`, `goal`, and the `withdrawn` flag, which removes a
whole class of inconsistent-state bugs.

### Security patterns used

- **Checks-effects-interactions** everywhere state and ETH move together:
  contributions are recorded before nothing external happens, the creator's
  `withdrawn` flag is set before the payout call, and a refund zeroes the
  contributor's balance *before* sending ETH back — so a re-entrant call finds
  nothing left to take.
- **Pull over push:** refunds are claimed individually by contributors. The
  contract never iterates over contributors to send ETH, avoiding blocked
  payouts and unbounded-loop gas problems.
- **Access control:** only a campaign's creator can withdraw its funds.
- **Custom errors** for every failure path, so tests assert exact revert
  reasons rather than string matching.

## Tech stack

- Solidity `^0.8.20` (no external imports — the contract compiles standalone)
- Hardhat 2 + `@nomicfoundation/hardhat-toolbox`
- Tests: Mocha/Chai with Hardhat network helpers (time travel) and Ethers.js v6

## How to run

```bash
npm install

# run the test suite
npx hardhat test

# compile only
npx hardhat compile

# start a local node, then deploy/interact from another terminal
npx hardhat node
```

To deploy, use `scripts/deploy.js` — locally against the node above, or to
Sepolia with `--network sepolia` (set `SEPOLIA_RPC_URL` and
`DEPLOYER_PRIVATE_KEY` first; see `.env.example`):

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## Project structure

```
token-crowdfunding-dapp/
├── contracts/
│   └── Crowdfunding.sol      # the crowdfunding contract (self-contained)
├── test/
│   └── Crowdfunding.test.js  # create / fund / withdraw / refund cases
├── scripts/
│   └── deploy.js             # Hardhat deploy script (local + Sepolia)
├── frontend/                 # React + Vite demo UI (ethers v6)
├── .github/workflows/        # CI: hardhat test on push / PR
├── hardhat.config.js
├── package.json
└── README.md
```

## Possible extensions

- ERC-20 contributions instead of native ETH
- Campaign categories and on-chain metadata (IPFS hash)
- A React + Ethers.js frontend with wallet connect and live campaign states

## License

MIT

## Live demo (Sepolia)

- Contract (Sepolia): TBD
- Demo: TBD

This demo runs on the Sepolia testnet — deploy the contract with
`scripts/deploy.js` and run the React app in `frontend/` against that
deployment (testnet ETH only, no real funds).
