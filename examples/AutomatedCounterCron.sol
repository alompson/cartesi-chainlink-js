// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title IAutomatedCounter
 * @dev A minimal interface for the Counter contract, specifically for the automated function.
 */
interface IAutomatedCounter {
    function incAutomated() external;
}

/**
 * @title AutomatedCounterCron
 * @dev This is a time-based custom logic upkeep that acts as a cronjob to call
 * the `incAutomated()` function on a Counter contract at a regular interval.
 */
contract AutomatedCounterCron is AutomationCompatibleInterface {
    /**
     * @dev Emitted when the upkeep successfully calls the Counter's incAutomated() function.
     * @param timestamp The block timestamp when the upkeep was performed.
     */
    event UpkeepSuccessfullyPerformed(uint256 timestamp);

    uint256 public immutable i_interval;
    uint256 public s_lastTimestamp;
    IAutomatedCounter public immutable i_counter;

    /**
     * @param counterAddress The address of the Counter contract to automate.
     * @param interval The interval in seconds for the cronjob (e.g., 5).
     */
    constructor(address counterAddress, uint256 interval) {
        if (counterAddress == address(0)) {
            revert("Counter address cannot be zero.");
        }
        if (interval == 0) {
            revert("Interval cannot be zero.");
        }
        i_counter = IAutomatedCounter(counterAddress);
        i_interval = interval;
        s_lastTimestamp = block.timestamp;
    }

    /**
     * @dev Called by the Automation network to check if the cronjob is due.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - s_lastTimestamp) > i_interval;
        performData = "0x";
    }

    /**
     * @dev Called by the Automation network to execute the cronjob.
     * This function calls `incAutomated()` on the Counter contract and resets the timer.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        if ((block.timestamp - s_lastTimestamp) <= i_interval) {
            revert("Time interval not met.");
        }

        s_lastTimestamp = block.timestamp;
        
        i_counter.incAutomated();

        emit UpkeepSuccessfullyPerformed(block.timestamp);
    }
} 