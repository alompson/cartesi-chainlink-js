// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { IInputBox } from "../../IInputBox.sol";

/// @notice This upkeep periodically sends a fixed payload to a given dApp via the InputBox.
/// @dev Designed for time-based Chainlink Automation (custom trigger type).
contract InputPusherCron {
    IInputBox public immutable inputBox;
    address public immutable appContract;
    uint256 public immutable interval;
    bytes public payload;

    uint256 public lastTimestamp;

    constructor(
        address _inputBox,
        address _appContract,
        uint256 _interval,
        bytes memory _payload
    ) {
        inputBox = IInputBox(_inputBox);
        appContract = _appContract;
        interval = _interval;
        payload = _payload;
        lastTimestamp = block.timestamp;
    }

    /// @notice Called off-chain by Chainlink nodes to decide if upkeep should run.
    function checkUpkeep(bytes calldata)
        external
        view
        returns (bool upkeepNeeded, bytes memory)
    {
        upkeepNeeded = (block.timestamp - lastTimestamp) >= interval;
        return (upkeepNeeded, bytes(""));
    }

    /// @notice Called on-chain by Chainlink nodes to execute the upkeep.
    function performUpkeep(bytes calldata) external {
        require((block.timestamp - lastTimestamp) >= interval, "Too soon");
        lastTimestamp = block.timestamp;
        inputBox.addInput(appContract, payload);
    }
}
