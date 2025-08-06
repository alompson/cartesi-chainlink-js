// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Counter
 * @dev A simple contract that counts up and emits an event on each increment.
 * This contract is useful for testing log-triggered automation.
 */
contract Counter {
    uint256 public count;

    /**
     * @dev Emitted when the counter is incremented.
     * @param newCount The new value of the counter.
     * @param sender The address that triggered the increment.
     */
    event Incremented(uint256 newCount, address indexed sender);

    /**
     * @dev Increments the counter by 1 and emits an Incremented event.
     */
    function inc() public {
        count++;
        emit Incremented(count, msg.sender);
    }
} 