// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title ICounter
 * @dev A minimal interface for the Counter contract to allow for type-safe calls.
 */
interface ICounter {
    function inc() external;
}

/**
 * @title CounterCronUpkeep
 * @dev This is a time-based custom logic upkeep that acts as a cronjob to call
 * the `inc()` function on a Counter contract every 5 seconds.
 */
contract CounterCronUpkeep is AutomationCompatibleInterface {
    /**
     * @dev Emitted when the upkeep successfully calls the Counter's inc() function.
     * @param timestamp The block timestamp when the upkeep was performed.
     */
    event UpkeepSuccessfullyPerformed(uint256 timestamp);

    /**
     * @dev The interval in seconds that must pass before the upkeep can be performed again.
     */
    uint256 public immutable i_interval;

    /**
     * @dev The timestamp of the last time the upkeep was performed.
     */
    uint256 public s_lastTimestamp;

    /**
     * @dev The Counter contract that this upkeep will call.
     */
    ICounter public immutable i_counter;

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
        i_counter = ICounter(counterAddress);
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
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - s_lastTimestamp) > i_interval;
        performData = "0x"; // No data needed for this simple upkeep
    }

    /**
     * @dev Called by the Automation network to execute the cronjob.
     * This function calls `inc()` on the Counter contract and resets the timer.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        if ((block.timestamp - s_lastTimestamp) <= i_interval) {
            revert("Time interval not met.");
        }

        s_lastTimestamp = block.timestamp;
        
        i_counter.inc();

        emit UpkeepSuccessfullyPerformed(block.timestamp);
    }
} 