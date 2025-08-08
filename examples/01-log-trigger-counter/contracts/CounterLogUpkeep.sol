// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILogAutomation {
    struct Log {
        uint256 index; uint256 timestamp; bytes32 txHash; uint256 blockNumber; bytes32 blockHash; address source; bytes32[] topics; bytes data;
    }
    function checkLog(Log calldata log, bytes calldata) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

interface ICounter {
    function incAutomated() external;
}

contract CounterLogUpkeep is ILogAutomation {
    address public immutable COUNTER;
    bytes32 public immutable TOPIC0;

    constructor(address counter) {
        COUNTER = counter;
        // keccak256("CounterIncremented(address)")
        TOPIC0 = keccak256(bytes("CounterIncremented(address)"));
    }

    function checkLog(Log calldata log, bytes calldata) external override returns (bool upkeepNeeded, bytes memory performData) {
        if (log.source != COUNTER) return (false, bytes(""));
        if (log.topics.length == 0 || log.topics[0] != TOPIC0) return (false, bytes(""));
        return (true, abi.encodeWithSelector(ICounter.incAutomated.selector));
    }

    function performUpkeep(bytes calldata performData) external override {
        (bool ok,) = COUNTER.call(performData);
        require(ok, "perform failed");
    }
} 