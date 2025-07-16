// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ILogAutomation,
    Log
} from "@chainlink/contracts/src/v0.8/automation/interfaces/ILogAutomation.sol";

/**
 * @title A Log-Triggered Upkeep for Reacting to Cartesi Inputs
 * @notice This contract demonstrates the most efficient pattern for automating a reaction to
 * new inputs sent to a Cartesi dApp.
 * @dev Instead of polling on a timer, this contract is triggered directly by the `InputAdded`
 * event from the `InputBox`. This is ideal for dApps that need to provide a responsive
 * on-chain reaction to user actions, such as confirming a deposit or registering an off-chain result.
 * It's a key component for building dynamic, event-driven applications.
 */
contract LogTriggeredInputTracker is ILogAutomation {
    /**
     * @notice Stores the raw data from the last input that triggered this upkeep.
     */
    bytes public lastInputData;

    /**
     * @notice Stores the index of the last input that was processed.
     */
    uint256 public lastInputIndex;

    /**
     * @notice This function is called off-chain by the Automation network after an `InputAdded` log is detected.
     * @dev It can perform validation before the on-chain `performUpkeep` is called.
     * The `log.topics` will contain the indexed parameters (`appContract`, `index`),
     * and `log.data` will contain the non-indexed `input` parameter.
     * @param log The raw log data from the `InputAdded` event.
     * @return upkeepNeeded A boolean indicating if performUpkeep should be called.
     * @return performData The data to pass to performUpkeep. Here, we pass the raw input payload and its index.
     */
    function checkLog(
        Log calldata log,
        bytes memory /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // The topic at index 2 of an `InputAdded` event is the `index` parameter.
        uint256 inputIndex = uint256(log.topics[2]);
        if (inputIndex <= lastInputIndex) {
            // We have already processed this input or a more recent one.
            return (false, "");
        }

        // For this example, we always perform the upkeep if the input is new.
        upkeepNeeded = true;

        // Pass both the input payload and its index to `performUpkeep`.
        // The raw `input` payload is in `log.data`.
        performData = abi.encode(log.data, inputIndex);

        return (upkeepNeeded, performData);
    }

    /**
     * @notice This function is called on-chain by the Automation network when checkLog returns true.
     * @dev It is responsible for executing the on-chain logic in response to the Cartesi input.
     * @param performData The ABI-encoded input payload and index from the `InputAdded` event log.
     */
    function performUpkeep(bytes calldata performData) external override {
        // Decode the data passed from `checkLog`.
        (bytes memory inputData, uint256 inputIndex) = abi.decode(
            performData,
            (bytes, uint256)
        );

        // --- Your Logic Here ---
        // You can now use the `inputData`, which is the input sent to your Cartesi dApp.
        // You can decode it, store it, or use it to trigger other on-chain actions.
        lastInputData = inputData;
        lastInputIndex = inputIndex;
        // --- End of Your Logic ---
    }
} 