const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_ETH = ethers.parseEther("1");
const TWO_ETH = ethers.parseEther("2");
const THREE_DAYS = 3 * 24 * 60 * 60;

describe("Crowdfunding", function () {
  let crowdfunding;
  let creator, alice, bob;

  beforeEach(async function () {
    [creator, alice, bob] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy();
  });

  async function createCampaign(goal = TWO_ETH, duration = THREE_DAYS) {
    const tx = await crowdfunding
      .connect(creator)
      .createCampaign("Save the whales", goal, duration);
    await tx.wait();
    return 0; // first campaign id
  }

  it("creates a campaign with the right fields", async function () {
    const id = await createCampaign();
    const campaign = await crowdfunding.campaigns(id);

    expect(campaign.creator).to.equal(creator.address);
    expect(campaign.title).to.equal("Save the whales");
    expect(campaign.goal).to.equal(TWO_ETH);
    expect(campaign.raised).to.equal(0);
    expect(campaign.withdrawn).to.equal(false);
    expect(await crowdfunding.campaignCount()).to.equal(1);
  });

  it("emits CampaignCreated on creation", async function () {
    await expect(
      crowdfunding.connect(creator).createCampaign("Hello", ONE_ETH, THREE_DAYS)
    ).to.emit(crowdfunding, "CampaignCreated");
  });

  it("accepts contributions and tracks them per contributor", async function () {
    const id = await createCampaign();

    await crowdfunding.connect(alice).contribute(id, { value: ONE_ETH });
    await crowdfunding.connect(bob).contribute(id, { value: ONE_ETH });

    const campaign = await crowdfunding.campaigns(id);
    expect(campaign.raised).to.equal(TWO_ETH);
    expect(await crowdfunding.contributions(id, alice.address)).to.equal(ONE_ETH);
    expect(await crowdfunding.contributions(id, bob.address)).to.equal(ONE_ETH);
  });

  it("rejects contributions after the deadline", async function () {
    const id = await createCampaign();
    await time.increase(THREE_DAYS + 1);

    await expect(
      crowdfunding.connect(alice).contribute(id, { value: ONE_ETH })
    ).to.be.revertedWithCustomError(crowdfunding, "CampaignEnded");
  });

  it("lets the creator withdraw once the goal is met and the deadline passed", async function () {
    const id = await createCampaign();
    await crowdfunding.connect(alice).contribute(id, { value: TWO_ETH });
    await time.increase(THREE_DAYS + 1);

    await expect(crowdfunding.connect(creator).withdraw(id)).to.changeEtherBalances(
      [creator, crowdfunding],
      [TWO_ETH, -TWO_ETH]
    );

    const campaign = await crowdfunding.campaigns(id);
    expect(campaign.withdrawn).to.equal(true);
  });

  it("blocks withdrawal before the deadline even if the goal is met", async function () {
    const id = await createCampaign();
    await crowdfunding.connect(alice).contribute(id, { value: TWO_ETH });

    await expect(
      crowdfunding.connect(creator).withdraw(id)
    ).to.be.revertedWithCustomError(crowdfunding, "CampaignNotEnded");
  });

  it("blocks withdrawal when the goal was missed", async function () {
    const id = await createCampaign();
    await crowdfunding.connect(alice).contribute(id, { value: ONE_ETH });
    await time.increase(THREE_DAYS + 1);

    await expect(
      crowdfunding.connect(creator).withdraw(id)
    ).to.be.revertedWithCustomError(crowdfunding, "GoalNotMet");
  });

  it("refunds contributors when the goal is missed", async function () {
    const id = await createCampaign();
    await crowdfunding.connect(alice).contribute(id, { value: ONE_ETH });
    await time.increase(THREE_DAYS + 1);

    await expect(crowdfunding.connect(alice).claimRefund(id)).to.changeEtherBalances(
      [alice, crowdfunding],
      [ONE_ETH, -ONE_ETH]
    );
    expect(await crowdfunding.contributions(id, alice.address)).to.equal(0);
  });

  it("does not allow a second refund claim", async function () {
    const id = await createCampaign();
    await crowdfunding.connect(alice).contribute(id, { value: ONE_ETH });
    await time.increase(THREE_DAYS + 1);

    await crowdfunding.connect(alice).claimRefund(id);
    await expect(
      crowdfunding.connect(alice).claimRefund(id)
    ).to.be.revertedWithCustomError(crowdfunding, "NothingToRefund");
  });
});
