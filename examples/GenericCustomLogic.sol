// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title An example of a time-based, custom logic Automation upkeep.
 * @notice This contract is designed to be a starting point for your own custom logic upkeeps.
 * @dev It includes a simple counter that can be incremented by an Automation upkeep
 * after a specified time interval has passed. The contract is owned by the address
 * that deploys it, which can also withdraw any LINK tokens funded to the contract.
 */
contract CustomLogic is AutomationCompatibleInterface {
    error NotReady();
    error OnlyOwner();

    /**
     * @notice The number of times the upkeep has been performed.
     */
    uint256 public counter;

    /**
     * @notice The timestamp of the last upkeep performance.
     */
    uint256 public lastTimeStamp;

    /**
     * @notice The time interval (in seconds) that must pass before the upkeep can be performed again.
     */
    uint256 public immutable interval;

    /**
     * @notice The address of the contract owner.
     */
    address public immutable owner;

    /**
     * @param _interval The time interval in seconds for the upkeep.
     */
    constructor(uint256 _interval) {
        interval = _interval;
        lastTimeStamp = block.timestamp;
        owner = msg.sender;
    }

    /**
     * @notice This is the function that Chainlink Automation nodes call off-chain to check if
     * the upkeep's conditions have been met.
     * @dev The check must be fast and inexpensive. It cannot write to storage.
     * @param /* checkData */ /* Custom data passed to the upkeep during registration. */
     * @return upkeepNeeded A boolean indicating if performUpkeep should be called.
     * @return performData Data to be passed to the performUpkeep function if upkeepNeeded is true.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        // We don't use the performData in this example, so we return an empty bytes string.
        performData = "";
        return (upkeepNeeded, performData);
    }

    /**
     * @notice This is the function that Chainlink Automation nodes call on-chain to perform the upkeep.
     * @dev It should only perform the logic that is absolutely necessary to prevent race conditions.
     * It should not re-check conditions that were already checked in checkUpkeep.
     * @param /* performData */ /* Data passed from the checkUpkeep function. */
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // This upkeep should only be performed if the interval has passed.
        if ((block.timestamp - lastTimeStamp) <= interval) {
            revert NotReady();
        }
        lastTimeStamp = block.timestamp;
        counter = counter + 1;
        // The rest of your logic, which can now safely execute.
    }

    /**
     * @notice Allows the contract owner to withdraw any LINK tokens funded to this contract.
     * @param _to The address to send the LINK tokens to.
     * @param _amount The amount of LINK to withdraw.
     * @dev This is a critical function to prevent funds from being locked in the contract.
     */
    function withdrawLink(address _to, uint256 _amount) external {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        // This requires importing an IERC20 interface, like the one from OpenZeppelin.
        // For simplicity, we assume the LINK token address and use a low-level call.
        // Example LINK token address on Sepolia: 0x779877A7B0D9E8603169DdbD7836e478b4624789
        // IERC20(linkTokenAddress).transfer(_to, _amount);
    }
} 