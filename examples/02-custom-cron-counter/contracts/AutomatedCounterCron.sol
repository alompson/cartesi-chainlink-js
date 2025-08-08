// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAutomationCompatible {
    function checkUpkeep(bytes calldata) external view returns (bool, bytes memory);
    function performUpkeep(bytes calldata) external;
}

interface ICounter {
    function incAutomated() external;
}

contract AutomatedCounterCron is IAutomationCompatible {
    address public immutable COUNTER;
    uint256 public immutable INTERVAL;
    uint256 public last;

    constructor(address counter, uint256 intervalSec) {
        COUNTER = counter;
        INTERVAL = intervalSec;
        last = block.timestamp;
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = (block.timestamp - last) >= INTERVAL;
        if (upkeepNeeded) {
            performData = abi.encodeWithSelector(ICounter.incAutomated.selector);
        }
    }

    function performUpkeep(bytes calldata performData) external override {
        require((block.timestamp - last) >= INTERVAL, "too soon");
        last = block.timestamp;
        (bool ok,) = COUNTER.call(performData);
        require(ok, "perform failed");
    }
} 