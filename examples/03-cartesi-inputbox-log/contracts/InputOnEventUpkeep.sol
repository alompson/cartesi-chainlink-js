// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILogAutomation {
    struct Log {
        uint256 index; uint256 timestamp; bytes32 txHash; uint256 blockNumber; bytes32 blockHash; address source; bytes32[] topics; bytes data;
    }
    function checkLog(Log calldata log, bytes calldata) external returns (bool, bytes memory);
    function performUpkeep(bytes calldata) external;
}

interface IInputBox {
    function addInput(address appContract, bytes calldata payload) external returns (bytes32);
}

contract InputOnEventUpkeep is ILogAutomation {
    address public immutable INPUT_BOX;
    address public immutable DAPP;
    bytes32 public immutable TOPIC0;

    constructor(address inputBox, address dapp, bytes32 topic0) {
        INPUT_BOX = inputBox;
        DAPP = dapp;
        TOPIC0 = topic0;
    }

    function checkLog(Log calldata log, bytes calldata) external override returns (bool upkeepNeeded, bytes memory performData) {
        if (log.topics.length > 0 && log.topics[0] == TOPIC0) {
            return (true, abi.encode(bytes("hello cartesi")));
        }
        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata performData) external override {
        IInputBox(INPUT_BOX).addInput(DAPP, abi.decode(performData, (bytes)));
    }
} 