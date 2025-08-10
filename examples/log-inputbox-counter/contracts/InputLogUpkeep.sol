// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ILogAutomation, Log} from "@chainlink/contracts/src/v0.8/automation/interfaces/ILogAutomation.sol";
import {IInputBox} from "../../IInputBox.sol";
import {Counter} from "./Counter.sol";

contract InputBoxLogCounter is ILogAutomation {
    IInputBox public immutable inputBox;
    address public immutable appContract;
    Counter public immutable counter;

    // keccak256("InputAdded(address,uint256,bytes)")
    bytes32 private constant TOPIC0_INPUT_ADDED =
        keccak256("InputAdded(address,uint256,bytes)");

    constructor(address _inputBox, address _appContract, address _counter) {
        inputBox = IInputBox(_inputBox);
        appContract = _appContract;
        counter = Counter(_counter);
    }

    function _topicToAddress(bytes32 t) internal pure returns (address) {
        return address(uint160(uint256(t)));
    }

    // Chainlink calls this when a matching log is observed
    function checkLog(Log calldata log, bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // 1) correct emitter
        if (log.source != address(inputBox)) return (false, "");

        // 2) correct event and topics present
        if (log.topics.length < 3) return (false, "");
        if (log.topics[0] != TOPIC0_INPUT_ADDED) return (false, "");

        // 3) appContract matches first indexed arg
        if (_topicToAddress(log.topics[1]) != appContract) return (false, "");

        // Optional: you can read the index if needed
        // uint256 index = uint256(log.topics[2]);

        return (true, "");
    }

    function performUpkeep(bytes calldata) external override {
        counter.increment();
    }
}
