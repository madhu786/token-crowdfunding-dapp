# Token Crowdfunding dApp (Solidity + Hardhat)

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

There is no deploy script by design — deploy `Crowdfunding` from the Hardhat
console or a one-line ignition/script of your own against the local node:

```js
const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
const cf = await Crowdfunding.deploy();
```

## Project structure

```
token-crowdfunding-dapp/
├── contracts/
│   └── Crowdfunding.sol      # the crowdfunding contract (self-contained)
├── test/
│   └── Crowdfunding.test.js  # create / fund / withdraw / refund cases
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
