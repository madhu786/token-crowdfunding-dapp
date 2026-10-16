// Deploy the Crowdfunding contract.
//
// Local:        npx hardhat run scripts/deploy.js
// Sepolia:      npx hardhat run scripts/deploy.js --network sepolia
//               (requires SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY — see .env.example)
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Network:  ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy();
  await crowdfunding.waitForDeployment();

  const address = await crowdfunding.getAddress();
  console.log(`Crowdfunding deployed to: ${address}`);

  if (hre.network.name === "sepolia") {
    console.log(`Etherscan: https://sepolia.etherscan.io/address/${address}`);
    console.log(
      "Next step: paste this address into frontend/src/contract.js (CONTRACT_ADDRESS)."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
