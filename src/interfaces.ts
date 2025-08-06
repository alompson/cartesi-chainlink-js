
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
    mode?: 'chainlink' | 'local'; // Defaults to 'chainlink' if not provided
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
 * The core interface for an Automation provider. This defines the contract
 * for how the main `Automation` class interacts with different underlying services.
 */
export interface IAutomationProvider {
    createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string }>;
    getUpkeep(upkeepId: string): Promise<UpkeepInfo>;
    addFunds(upkeepId: string, amount: string): Promise<void>;
    pauseUpkeep(upkeepId: string): Promise<void>;
    unpauseUpkeep(upkeepId: string): Promise<void>;
    cancelUpkeep(upkeepId: string): Promise<void>;
}


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
