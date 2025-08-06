// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title CronUpkeep
 * @dev This contract is a time-based custom logic upkeep that simulates a cronjob.
 * It is designed to have its `performUpkeep` function called periodically based
 * on a configurable interval.
 */
contract CronUpkeep is AutomationCompatibleInterface {
    /**
     * @dev Emitted when this upkeep is successfully performed.
     * @param timestamp The block timestamp when the upkeep was performed.
     */
    event UpkeepPerformed(uint256 timestamp);

    /**
     * @dev The interval in seconds that must pass before the upkeep can be performed again.
     */
    uint256 public immutable i_interval;

    /**
     * @dev The timestamp of the last time the upkeep was performed.
     */
    uint256 public s_lastTimestamp;

    /**
     * @param interval The interval in seconds for the cronjob.
     */
    constructor(uint256 interval) {
        if (interval == 0) {
            revert("Interval cannot be zero.");
        }
        i_interval = interval;
        s_lastTimestamp = block.timestamp;
    }

    /**
     * @dev This function is called by the Chainlink Automation network (or our simulator)
     * on every block to check if the upkeep needs to be performed.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - s_lastTimestamp) >= i_interval;
        // We don't need to pass any specific data to performUpkeep in this example.
        performData = "0x";
    }

    /**
     * @dev This function is called by the Chainlink Automation network (or our simulator)
     * when the `checkUpkeep` function returns true. It performs the scheduled action.
     *
     * IMPORTANT: This function must update the s_lastTimestamp to reset the timer.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // First, check if enough time has passed. This is a redundant check
        // to prevent direct calls from bypassing the interval, but it's good practice.
        if ((block.timestamp - s_lastTimestamp) < i_interval) {
            revert("Time interval not met.");
        }

        // --- Your Custom Logic Goes Here ---
        // For this example, we will just emit an event.
        // In a real application, you would call another contract, etc.
        // ------------------------------------

        // Update the timestamp to reset the timer for the next interval.
        s_lastTimestamp = block.timestamp;

        emit UpkeepPerformed(block.timestamp);
    }
} 