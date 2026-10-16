// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Crowdfunding
/// @notice Minimal all-or-nothing crowdfunding.
///         Anyone can create a campaign with a funding goal and a deadline.
///         Contributors send ETH while the campaign is live. If the goal is
///         met by the deadline the creator can withdraw the full balance;
///         if the goal is missed, contributors claim refunds themselves
///         (pull pattern — the contract never pushes ETH out in a loop).
contract Crowdfunding {
    struct Campaign {
        address creator;
        string title;
        uint256 goal; // in wei
        uint256 deadline; // unix timestamp
        uint256 raised; // total ETH contributed
        bool withdrawn; // creator has taken the funds
    }

    Campaign[] public campaigns;

    /// @notice campaignId => contributor => amount contributed
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );
    event Contributed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event Withdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);
    event Refunded(uint256 indexed campaignId, address indexed contributor, uint256 amount);

    error InvalidGoal();
    error InvalidDeadline();
    error CampaignNotFound();
    error CampaignEnded();
    error CampaignNotEnded();
    error ZeroContribution();
    error GoalNotMet();
    error GoalMet();
    error NothingToRefund();
    error AlreadyWithdrawn();
    error NotCreator();
    error TransferFailed();

    /// @notice Create a new campaign.
    /// @param title Human-readable campaign title.
    /// @param goal Funding target in wei; must be greater than zero.
    /// @param durationSeconds Seconds from now until the deadline; must be > 0.
    /// @return campaignId Index of the new campaign.
    function createCampaign(
        string calldata title,
        uint256 goal,
        uint256 durationSeconds
    ) external returns (uint256 campaignId) {
        if (goal == 0) revert InvalidGoal();
        if (durationSeconds == 0) revert InvalidDeadline();

        uint256 deadline = block.timestamp + durationSeconds;
        campaigns.push(
            Campaign({
                creator: msg.sender,
                title: title,
                goal: goal,
                deadline: deadline,
                raised: 0,
                withdrawn: false
            })
        );
        campaignId = campaigns.length - 1;
        emit CampaignCreated(campaignId, msg.sender, title, goal, deadline);
    }

    /// @notice Contribute ETH to a live campaign.
    function contribute(uint256 campaignId) external payable {
        if (campaignId >= campaigns.length) revert CampaignNotFound();
        if (msg.value == 0) revert ZeroContribution();

        Campaign storage campaign = campaigns[campaignId];
        if (block.timestamp >= campaign.deadline) revert CampaignEnded();

        // Effects before any external interaction (checks-effects-interactions).
        contributions[campaignId][msg.sender] += msg.value;
        campaign.raised += msg.value;

        emit Contributed(campaignId, msg.sender, msg.value);
    }

    /// @notice Creator withdraws the raised funds once the deadline has passed
    ///         and the goal was met.
    function withdraw(uint256 campaignId) external {
        if (campaignId >= campaigns.length) revert CampaignNotFound();

        Campaign storage campaign = campaigns[campaignId];
        if (msg.sender != campaign.creator) revert NotCreator();
        if (block.timestamp < campaign.deadline) revert CampaignNotEnded();
        if (campaign.raised < campaign.goal) revert GoalNotMet();
        if (campaign.withdrawn) revert AlreadyWithdrawn();

        // Effects first, then the single external call.
        campaign.withdrawn = true;
        uint256 amount = campaign.raised;

        (bool ok, ) = campaign.creator.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(campaignId, campaign.creator, amount);
    }

    /// @notice Contributors claim their ETH back if the deadline passed and
    ///         the goal was not met.
    function claimRefund(uint256 campaignId) external {
        if (campaignId >= campaigns.length) revert CampaignNotFound();

        Campaign storage campaign = campaigns[campaignId];
        if (block.timestamp < campaign.deadline) revert CampaignNotEnded();
        if (campaign.raised >= campaign.goal) revert GoalMet();

        uint256 amount = contributions[campaignId][msg.sender];
        if (amount == 0) revert NothingToRefund();

        // Zero the balance before sending (checks-effects-interactions).
        contributions[campaignId][msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Refunded(campaignId, msg.sender, amount);
    }

    /// @notice Number of campaigns created so far.
    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}
