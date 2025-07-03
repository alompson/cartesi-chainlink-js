
import { Signer } from 'ethers';

// =================================================================
// SECTION 1: Interfaces for ON-CHAIN actions (e.g., registering an upkeep)
// Used by the main `Automation` class and its `createUpkeep` method.
// =================================================================

/**
 * Configuration for initializing the main Automation library class.
 */
export interface AutomationConfig {
    signer: Signer;
    chainId: number;
}

/**
 * The base set of options for registering any type of upkeep.
 * This is for a contract that has ALREADY been deployed.
 */
export interface CreateUpkeepBaseOptions {
    name: string;
    upkeepContract: string; // The address of the deployed contract to automate
    gasLimit: number;
    initialFunds: string; // e.g., '10.0' for 10 LINK
    checkData?: string;
    offchainConfig?: string;
}

/**
 * Options for registering a LOG-triggered upkeep.
 */
export interface CreateLogUpkeepOptions extends CreateUpkeepBaseOptions {
    triggerType: 'log';
    logEmitterAddress: string;
    logEventSignature: string; // e.g., "MyEvent(address,uint256)"
    logTopicFilters?: (string | null)[];
}

/**
 * Options for registering a CUSTOM LOGIC-triggered upkeep.
 */
export interface CreateCustomUpkeepOptions extends CreateUpkeepBaseOptions {
    triggerType: 'custom';
}

/**
 * A combined type used by the public `createUpkeep` function.
 */
export type CreateUpkeepOptions = CreateLogUpkeepOptions | CreateCustomUpkeepOptions;


// =================================================================
// SECTION 2: Interfaces for OFF-CHAIN actions (e.g., generating .sol files)
// Used by the `generateCompatibleContract` function.
// =================================================================

/**
 * The base set of options for generating the source code of a compatible contract.
 */
interface GenerateContractBaseOptions {
    performLogic: string; // The raw Solidity code to inject into performUpkeep()
}

/**
 * Options for generating a CUSTOM LOGIC contract.
 */
export interface GenerateCustomLogicContractOptions extends GenerateContractBaseOptions {
    triggerType: 'custom';
    checkLogic: string; // The raw Solidity for the conditional check
}

/**
 * Options for generating a LOG TRIGGER contract.
 */
export interface GenerateLogContractOptions extends GenerateContractBaseOptions {
    triggerType: 'log';
    // No checkLogic needed, as the event is the trigger
}

/**
 * A combined type used by the public `generateCompatibleContract` function.
 */
export type GenerateContractOptions = GenerateCustomLogicContractOptions | GenerateLogContractOptions;

/**
 * Represents the information about an upkeep that has been registered on-chain.
 */
export interface UpkeepInfo {
    target: string;
    admin: string;
    balance: string; // Formatted as a string for readability
    gasLimit: number;
    isPaused: boolean;
    performData: string;
}
