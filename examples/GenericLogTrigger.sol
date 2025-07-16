// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ILogAutomation,
    Log
} from "@chainlink/contracts/src/v0.8/automation/interfaces/ILogAutomation.sol";

/**
 * @title An example of a log-triggered Automation upkeep.
 * @notice This contract is designed to be a starting point for your own log-triggered upkeeps.
 * @dev It is compatible with the ILogAutomation interface and demonstrates how to handle
 * log data within the performUpkeep function. The checkLog function is made `view` to
 * allow for on-chain state checks before returning, a common and necessary pattern.
 */
contract LogTrigger is ILogAutomation {
    /**
     * @notice Stores the data from the last log that triggered an upkeep.
     */
    bytes public lastLogData;

    /**
     * @notice A simple flag to demonstrate enabling/disabling the upkeep.
     */
    bool public isPaused;

    /**
     * @notice This function is called off-chain by the Automation network after a log is detected.
     * @dev It can be used to perform validation and state checks. It should be `view` to read state.
     * @param log The raw log data that matched the trigger filters.
     * @return upkeepNeeded A boolean indicating if performUpkeep should be called.
     * @return performData The data to pass to performUpkeep.
     */
    function checkLog(
        Log calldata log,
        bytes memory /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // This is a simple check to demonstrate that on-chain state can be read.
        // For example, you could prevent execution if the contract is paused.
        if (isPaused) {
            return (false, "");
        }

        // For this example, we always consider the upkeep needed if not paused,
        // and we pass the raw log data to be processed on-chain.
        upkeepNeeded = true;
        performData = log.data;
        return (upkeepNeeded, performData);
    }

    /**
     * @notice This function is called on-chain by the Automation network when checkLog returns true.
     * @dev It is responsible for executing the core logic of the upkeep.
     * @param performData The data returned by checkLog, which is the raw data from the
     * emitted event log. You are responsible for decoding it here.
     */
    function performUpkeep(bytes calldata performData) external override {
        // Store the log data. In a real contract, you would decode and use this data.
        // Example of decoding:
        // (uint256 tradeId, address user) = abi.decode(performData, (uint256, address));
        lastLogData = performData;

        // The rest of your action logic goes here.
    }

    /**
     * @notice A simple function to toggle the paused state.
     */
    function setPaused(bool _paused) external {
        // In a real contract, you would add access control (e.g., owner-only).
        isPaused = _paused;
    }
} 