// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title CounterLogUpkeep
 * @dev This contract listens for an `Incremented` event from a specific
 * Counter contract and, when triggered, emits its own event.
 * It is an example of a log-triggered Automation upkeep.
 */
contract CounterLogUpkeep is AutomationCompatibleInterface {
    /**
     * @dev Emitted when this upkeep is successfully performed.
     * @param message A descriptive message about the action taken.
     */
    event UpkeepPerformed(string message);

    /**
     * @dev The address of the Counter contract that this upkeep is listening to.
     */
    address public immutable i_counter;

    constructor(address counterAddress) {
        if (counterAddress == address(0)) {
            revert("Counter address cannot be zero.");
        }
        i_counter = counterAddress;
    }

    /**
     * @dev This function is called by the Chainlink Automation network (or our simulator)
     * to check if the upkeep needs to be performed. For log triggers, we can
     * simply return `true` as the log itself is the primary condition.
     * The `checkData` will contain the log that triggered this check.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // For log-triggered upkeeps, the filtering is done off-chain by the
        // node/simulator. So, if checkUpkeep is called, it means our log was seen.
        upkeepNeeded = true;
        // We don't need to pass any specific data to performUpkeep in this example.
        performData = "0x"; 
    }

    /**
     * @dev This function is called by the Chainlink Automation network (or our simulator)
     * when the `checkUpkeep` function returns true. It performs the action.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // This upkeep's only job is to emit an event confirming it was triggered.
        emit UpkeepPerformed("Counter incremented!");
    }
} 