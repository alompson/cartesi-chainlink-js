// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Counter } from "./Counter.sol";
import { IInputBox } from "../../IInputBox.sol";

/// @notice This upkeep listens for InputBox.InputAdded events for a specific appContract
///         and increments a Counter whenever one occurs.
/// @dev Designed for log-based Chainlink Automation.
contract InputBoxLogCounter {
    IInputBox public immutable inputBox;
    address public immutable appContract;
    Counter public immutable counter;

    constructor(
        address _inputBox,
        address _appContract,
        address _counter
    ) {
        inputBox = IInputBox(_inputBox);
        appContract = _appContract;
        counter = Counter(_counter);
    }

    /// @notice For log-triggered upkeeps, checkUpkeep/performUpkeep still exist,
    ///         but checkUpkeep's logic is usually trivial because Chainlink filters
    ///         by event signature + emitter address off-chain.
    function checkUpkeep(bytes calldata)
        external
        pure
        returns (bool upkeepNeeded, bytes memory)
    {
        // The off-chain automation node will decide when to call based on logs.
        return (true, bytes(""));
    }

    /// @notice Called when the Automation node detects the configured log event.
    function performUpkeep(bytes calldata) external {
        counter.increment();
    }
}
