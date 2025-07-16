// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title Interface for the Cartesi InputBox.
 * @dev This is the official interface for the Cartesi InputBox contract,
 * allowing for robust interaction with the Cartesi ecosystem.
 */
interface IInputBox {
    /// @notice MUST trigger when an input is added.
    /// @param appContract The application contract address
    /// @param index The input index
    /// @param input The input blob
    event InputAdded(address indexed appContract, uint256 indexed index, bytes input);

    /// @notice Input is too large.
    /// @param appContract The application contract address
    /// @param inputLength The input length
    /// @param maxInputLength The maximum input length
    error InputTooLarge(address appContract, uint256 inputLength, uint256 maxInputLength);

    /// @notice Send an input to an application.
    /// @param appContract The application contract address
    /// @param payload The input payload
    /// @return The hash of the input blob
    /// @dev MUST fire an `InputAdded` event.
    function addInput(address appContract, bytes calldata payload) external returns (bytes32);

    /// @notice Get the number of inputs sent to an application.
    /// @param appContract The application contract address
    function getNumberOfInputs(address appContract) external view returns (uint256);

    /// @notice Get the hash of an input in an application's input box.
    /// @param appContract The application contract address
    /// @param index The input index
    /// @dev The provided index must be valid.
    function getInputHash(address appContract, uint256 index) external view returns (bytes32);

    /// @notice Get number of block in which contract was deployed
    function getDeploymentBlockNumber() external view returns (uint256);
}

/**
 * @title A Programmatic Automator for Cartesi dApps
 * @notice This contract is a blueprint for programmatically triggering Cartesi dApps.
 * @dev This contract is designed to be deployed by a "manager" contract or a backend script.
 * Each instance can represent a unique, automated task (e.g., a single user's DeFi
 * strategy vault, a dynamic in-game event). Its `performUpkeep` function's sole purpose
 * is to send an input to a Cartesi dApp, triggering complex off-chain computation.
 */
contract CartesiAutomator is AutomationCompatibleInterface {
    error NotReady();
    error OnlyOwner();

    IInputBox public immutable inputBox;
    address public immutable cartesiDAppAddress;
    address public immutable owner;

    uint256 public immutable interval;
    uint256 public lastTimeStamp;

    /**
     * @param _interval The time interval in seconds for the upkeep.
     * @param _inputBox The address of the Cartesi InputBox contract for your target network.
     * @param _cartesiDApp The address of your Cartesi dApp.
     */
    constructor(uint256 _interval, address _inputBox, address _cartesiDApp) {
        interval = _interval;
        lastTimeStamp = block.timestamp;
        owner = msg.sender;
        inputBox = IInputBox(_inputBox);
        cartesiDAppAddress = _cartesiDApp;
    }

    /**
     * @notice This function is called off-chain by Chainlink Automation nodes.
     * @dev It checks if the required time interval has passed.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
        // The `performData` can be used to pass dynamic data to `performUpkeep`.
        // For example, you could read an on-chain price and pass it here.
        performData = "";
        return (upkeepNeeded, performData);
    }

    /**
     * @notice This is the core function that bridges to Cartesi.
     * @dev It is called on-chain by the Automation network. Instead of performing logic,
     * it ABI-encodes a payload and sends it as an input to the Cartesi dApp.
     * The off-chain Cartesi Machine will then execute its complex logic based on this input.
     * @param performData Data passed from checkUpkeep. Can be used to make the input dynamic.
     */
    function performUpkeep(bytes calldata performData) external override {
        if ((block.timestamp - lastTimeStamp) <= interval) {
            revert NotReady();
        }
        lastTimeStamp = block.timestamp;

        // Encode the input for the Cartesi Machine.
        // This is a simple example that sends the performData and the caller's address.
        // You can customize this payload to include any data your dApp needs.
        bytes memory input = abi.encode(performData, msg.sender);

        // Send the input to the Cartesi dApp via the InputBox.
        inputBox.addInput(cartesiDAppAddress, input);
    }

    /**
     * @notice Allows the contract owner to withdraw any LINK tokens funded to this contract.
     */
    function withdrawLink(address _to, uint256 _amount) external {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        // This requires importing a standard IERC20 interface and the LINK token address.
        // For simplicity, this is commented out. In a real-world scenario, you would
        // use a standard token interface (like OpenZeppelin's) to handle the transfer.
        // IERC20(linkTokenAddress).transfer(_to, _amount);
    }
} 