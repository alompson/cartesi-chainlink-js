// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Counter
 * @notice A tiny counter with a public "manual" increment and a separate
 *         "automated" increment that your upkeep will call.
 * @dev We keep it deliberately simple—no access control on the automated
 *      method—because anyone can call performUpkeep on mainnet anyway.
 */
contract Counter {
    event ManualIncrement(address indexed sender, uint256 newValue);
    event AutomatedIncrement(address indexed caller, uint256 newValue);

    uint256 public value;

    /// @notice Manual increment for humans / tests.
    function inc() external {
        unchecked { value += 1; }
        emit ManualIncrement(msg.sender, value);
    }

    /// @notice Increment that your Automation upkeeps will call.
    function incAutomated() external {
        unchecked { value += 1; }
        emit AutomatedIncrement(msg.sender, value);
    }
}
