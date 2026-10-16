// Address of the Crowdfunding deployment on Sepolia.
// Deploy with `npx hardhat run scripts/deploy.js --network sepolia` in the
// project root, then paste the deployed address here.
export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export const IS_PLACEHOLDER =
  CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";

// Sepolia chain id — the demo contract lives there, not on mainnet.
export const SEPOLIA_CHAIN_ID = 11155111n;

// ABI for the public interface of contracts/Crowdfunding.sol.
export const CROWDFUNDING_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "campaigns",
    outputs: [
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "string", name: "title", type: "string" },
      { internalType: "uint256", name: "goal", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "raised", type: "uint256" },
      { internalType: "bool", name: "withdrawn", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "campaignCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "contributions",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "title", type: "string" },
      { internalType: "uint256", name: "goal", type: "uint256" },
      { internalType: "uint256", name: "durationSeconds", type: "uint256" },
    ],
    name: "createCampaign",
    outputs: [{ internalType: "uint256", name: "campaignId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "campaignId", type: "uint256" }],
    name: "contribute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "campaignId", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "campaignId", type: "uint256" }],
    name: "claimRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "title", type: "string" },
      { indexed: false, internalType: "uint256", name: "goal", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "CampaignCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "contributor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Contributed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "campaignId", type: "uint256" },
      { indexed: true, internalType: "address", name: "contributor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Refunded",
    type: "event",
  },
  { inputs: [], name: "InvalidGoal", type: "error" },
  { inputs: [], name: "InvalidDeadline", type: "error" },
  { inputs: [], name: "CampaignNotFound", type: "error" },
  { inputs: [], name: "CampaignEnded", type: "error" },
  { inputs: [], name: "CampaignNotEnded", type: "error" },
  { inputs: [], name: "ZeroContribution", type: "error" },
  { inputs: [], name: "GoalNotMet", type: "error" },
  { inputs: [], name: "GoalMet", type: "error" },
  { inputs: [], name: "NothingToRefund", type: "error" },
  { inputs: [], name: "AlreadyWithdrawn", type: "error" },
  { inputs: [], name: "NotCreator", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
];
