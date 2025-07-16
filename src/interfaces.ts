
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
    encryptedEmail?: string; // Optional, for off-chain notifications. Defaults to '0x' if not provided
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
