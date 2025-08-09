// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Counter {
    uint256 public value;

    function increment() external {
        value += 1;
    }
}
