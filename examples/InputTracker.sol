// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title Interface for the Cartesi InputBox.
 * @dev This is the official interface for the Cartesi InputBox contract.
 */
interface IInputBox {
    event InputAdded(address indexed appContract, uint256 indexed index, bytes input);
    error InputTooLarge(address appContract, uint256 inputLength, uint256 maxInputLength);
    function addInput(address appContract, bytes calldata payload) external returns (bytes32);
    function getNumberOfInputs(address appContract) external view returns (uint256);
    function getInputHash(address appContract, uint256 index) external view returns (bytes32);
    function getDeploymentBlockNumber() external view returns (uint256);
}

/**
 * @title An Upkeep that programmatically tracks and processes Cartesi inputs.
 * @notice This contract demonstrates how an on-chain component can react to a dynamic
 * number of off-chain events within the Cartesi ecosystem.
 * @dev This pattern is ideal for use cases that require on-chain state to be synchronized
 * with a series of off-chain actions, such as batch processing NFT mints after a certain
 * number of game events, or settling a prediction market after enough oracle inputs have
 * been collected off-chain. It processes one input per call to keep gas costs low.
 */
contract InputTracker is AutomationCompatibleInterface {
    error NoNewInputs();

    IInputBox public immutable inputBox;
    address public immutable cartesiDAppAddress;

    /**
     * @notice The index of the next input to be processed.
     */
    uint256 public nextInputToProcess;

    /**
     * @notice The hash of the most recently processed input.
     */
    bytes32 public lastProcessedInputHash;

    /**
     * @param _inputBox The address of the Cartesi InputBox contract for your target network.
     * @param _cartesiDApp The address of the Cartesi dApp to track.
     */
    constructor(address _inputBox, address _cartesiDApp) {
        inputBox = IInputBox(_inputBox);
        cartesiDAppAddress = _cartesiDApp;
    }

    /**
     * @notice This function is called off-chain by Chainlink Automation nodes.
     * @dev It compares the number of inputs this contract has processed with the total
     * number of inputs for the target dApp in the InputBox.
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 totalInputs = inputBox.getNumberOfInputs(cartesiDAppAddress);
        upkeepNeeded = totalInputs > nextInputToProcess;
        // performData is not used in this simple example.
        performData = "";
        return (upkeepNeeded, performData);
    }

    /**
     * @notice This function processes one new input from the InputBox.
     * @dev It fetches the hash of the next available input, stores it, and increments
     * the counter. If multiple inputs are pending, `checkUpkeep` will remain true,
     * causing this function to be called again in a subsequent transaction.
     * @param /* performData */ /* Data passed from checkUpkeep. Not used here.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        uint256 totalInputs = inputBox.getNumberOfInputs(cartesiDAppAddress);
        if (totalInputs <= nextInputToProcess) {
            revert NoNewInputs();
        }

        // Get the hash of the next input
        bytes32 inputHash = inputBox.getInputHash(cartesiDAppAddress, nextInputToProcess);

        // --- Your Logic Here ---
        // Now that you have the input hash, you can perform an on-chain action.
        // For this example, we just store the hash.
        lastProcessedInputHash = inputHash;
        // --- End of Your Logic ---

        // Increment the counter to process the next input in the following run.
        nextInputToProcess++;
    }
} 