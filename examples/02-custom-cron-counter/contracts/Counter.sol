// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Counter {
    uint256 public counter;

    event CounterIncremented(address indexed sender);

    function inc() external {
        counter += 1;
        emit CounterIncremented(msg.sender);
    }
} 