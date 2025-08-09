// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * Minimal InputBox interface (only what we call).
 * On mainnet/testnet you will point to the official deployed InputBox;
 * locally you can deploy Cartesi's reference InputBox or a compatible mock.
 */
interface IInputBox {
    function addInput(address appContract, bytes calldata payload) external returns (bytes32);
}

/**
 * @title InputPusherCron
 * @notice A "custom logic" (time-based) upkeep that periodically calls InputBox.addInput
 *         for a specific Cartesi dApp (appContract). This is the canonical “cron-like” pattern.
 *
 * Chainlink expectations (guidelines):
 * - checkUpkeep must be view and cheap; it only decides whether to run performUpkeep.
 * - performUpkeep should not re-check complex conditions; it executes and updates state.
 * - Use an interval and a lastTimeStamp to avoid over-execution and race conditions.
 */
contract InputPusherCron is AutomationCompatibleInterface {
    error NotReady();

    IInputBox public immutable inputBox;
    address  public immutable appContract;

    // Simple time-based cadence
    uint256 public immutable interval;
    uint256 public lastTimeStamp;

    // Example payload producer; keep it small. In production this may be dynamic/off-chain assembled.
    bytes public payload;

    constructor(
        address _inputBox,
        address _appContract,
        uint256 _interval,
        bytes memory _payload
    ) {
        require(_inputBox != address(0), "inputBox=0");
        require(_appContract != address(0), "appContract=0");
        require(_interval > 0, "interval=0");

        inputBox     = IInputBox(_inputBox);
        appContract  = _appContract;
        interval     = _interval;
        lastTimeStamp = block.timestamp;
        payload      = _payload;
    }

    function setPayload(bytes calldata newPayload) external {
        // add real access control in production
        payload = newPayload;
    }

    // Off-chain check: is it time yet?
    function checkUpkeep(bytes calldata /*checkData*/)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) >= interval;
        performData = ""; // not needed here
    }

    // On-chain execution: push input into InputBox
    function performUpkeep(bytes calldata /*performData*/) external override {
        if ((block.timestamp - lastTimeStamp) < interval) revert NotReady();
        lastTimeStamp = block.timestamp;

        // Minimal input to demonstrate the flow
        inputBox.addInput(appContract, payload);
    }
}
