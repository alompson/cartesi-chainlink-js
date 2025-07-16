import { ethers, ContractReceipt, Contract } from 'ethers';
import { AutomationConfig, CreateUpkeepOptions, CreateLogUpkeepOptions, UpkeepInfo } from './interfaces';
import { getAutomationNetworkConfig } from './core/networks';
import { encrypt } from '@ethersproject/json-wallets/lib/keystore';

export class Automation {
    private _config: AutomationConfig;
    private _networkConfig: ReturnType<typeof getAutomationNetworkConfig>;
    
    // Private properties to hold the instantiated contract objects
    private _registrar: Contract;
    private _registry: Contract;
    private _linkToken: Contract;

    constructor(config: AutomationConfig) {
        this._config = config;
        this._networkConfig = getAutomationNetworkConfig(config.chainId);

        const {
            registrarAddress,
            registrarAbi,
            registryAddress,
            registryAbi,
            linkTokenAddress,
            linkTokenAbi,
        } = this._networkConfig;
        
        // Initialize all contract objects once and store them
        this._registrar = new ethers.Contract(registrarAddress, registrarAbi, this._config.signer);
        this._registry = new ethers.Contract(registryAddress, registryAbi, this._config.signer);
        this._linkToken = new ethers.Contract(linkTokenAddress, linkTokenAbi, this._config.signer);
    }

    /**
     * Registers a new Chainlink Automation upkeep.
     */
    async createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string }> {
        try {
            const fundsInWei = ethers.utils.parseEther(options.initialFunds);

            console.log(`Approving ${options.initialFunds} LINK for the registrar...`);
            const approveTx = await this._linkToken.approve(this._networkConfig.registrarAddress, fundsInWei);
            await approveTx.wait();
            console.log('Approval successful.');

            const registrationParams = {
                name: options.name,
                encryptedEmail: options.encryptedEmail || '0x',
                upkeepContract: options.upkeepContract,
                gasLimit: options.gasLimit,
                adminAddress: await this._config.signer.getAddress(),
                triggerType: options.triggerType === 'log' ? 1 : 0,
                checkData: options.checkData || '0x',
                triggerConfig: this._encodeTriggerConfig(options),
                offchainConfig: options.offchainConfig || '0x',
                amount: fundsInWei,
            };

            console.log('Registering upkeep...');
            const registerTx = await this._registrar.registerUpkeep(registrationParams);
            const receipt = await registerTx.wait();
            
            const upkeepId = this._parseUpkeepIdFromReceipt(receipt);
            console.log(`✅ Upkeep registered successfully! Upkeep ID: ${upkeepId}`);

            return { upkeepId };
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * Retrieves the on-chain information for an existing upkeep.
     */
    async getUpkeep(upkeepId: string): Promise<UpkeepInfo> {
        try {
            const upkeepData = await this._registry.getUpkeep(upkeepId);
            return {
                target: upkeepData.target,
                admin: upkeepData.admin,
                balance: ethers.utils.formatEther(upkeepData.balance),
                gasLimit: upkeepData.gasLimit,
                isPaused: upkeepData.paused,
                performData: upkeepData.performData,
            };
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * Adds more LINK funds to an existing upkeep.
     */
    async addFunds(upkeepId: string, amount: string): Promise<void> {
        try {
            const amountInWei = ethers.utils.parseEther(amount);
            
            console.log(`Approving ${amount} LINK to be spent by the Registry...`);
            const approveTx = await this._linkToken.approve(this._networkConfig.registryAddress, amountInWei);
            await approveTx.wait();
            console.log('Approval successful.');

            console.log(`Adding ${amount} LINK to upkeep ${upkeepId}...`);
            const addFundsTx = await this._registry.addFunds(upkeepId, amountInWei);
            await addFundsTx.wait();
            console.log('✅ Funds added successfully!');
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * Pauses a currently active upkeep.
     */
    async pauseUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Pausing upkeep ${upkeepId}...`);
            const tx = await this._registry.pauseUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep paused.');
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * Resumes a paused upkeep.
     */
    async unpauseUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Unpausing upkeep ${upkeepId}...`);
            const tx = await this._registry.unpauseUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep unpaused and is now active.');
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * Cancels an upkeep permanently.
     */
    async cancelUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Canceling upkeep ${upkeepId}...`);
            const tx = await this._registry.cancelUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep canceled.');
        } catch (error) {
            this._handleContractError(error);
        }
    }

    /**
     * @private
     * Encodes the trigger-specific configuration into the bytes format.
     */
    private _encodeTriggerConfig(options: CreateUpkeepOptions): string {
        if (options.triggerType === 'custom') {
            return '0x';
        }

        const logOptions = options as CreateLogUpkeepOptions;
        const topic0 = ethers.utils.id(logOptions.logEventSignature);
        let filterSelector = 0;
        const topics: (string | null)[] = [null, null, null];

        if (logOptions.logTopicFilters) {
            for (let i = 0; i < 3; i++) {
                if (logOptions.logTopicFilters[i]) {
                    filterSelector |= (1 << i);
                    topics[i] = ethers.utils.hexZeroPad(logOptions.logTopicFilters[i]!, 32);
                }
            }
        }
        
        return ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint8', 'bytes32', 'bytes32', 'bytes32', 'bytes32'],
            [
                logOptions.logEmitterAddress,
                filterSelector,
                topic0,
                topics[0] || ethers.constants.HashZero,
                topics[1] || ethers.constants.HashZero,
                topics[2] || ethers.constants.HashZero,
            ]
        );
    }

    /**
     * @private
     * Parses the transaction receipt to find and extract the upkeepId.
     */
    private _parseUpkeepIdFromReceipt(receipt: ContractReceipt): string {
        // Use the Registry's interface to find the event in the raw logs
        const eventName = 'UpkeepRegistered';

        for (const log of receipt.logs) {
            // Only try to parse logs from the Registry contract address
            if (log.address === this._registry.address) {
                try {
                    const parsedLog = this._registry.interface.parseLog(log);
                    if (parsedLog.name === eventName) {
                        return parsedLog.args.id.toString();
                    }
                } catch (error) {
                    // This log from the registry was not the one we were looking for, continue
                }
            }
        }

        // If the loop completes without finding the event, throw an error.
        throw new Error(`Could not find the ${eventName} event in the transaction receipt.`);
    }

    /**
     * @private
     * Recursively searches for the revert data in a nested error object.
     */
    private _findRevertData(error: any): string | undefined {
        if (!error) return undefined;

        // The revert data is usually in a `data` property
        if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
            return error.data;
        }

        // Ethers-v5 nests errors in an `error` property
        if (error.error) {
            return this._findRevertData(error.error);
        }
        
        // Sometimes it's in a JSON-RPC response body
        if (typeof error.body === 'string') {
            try {
                const body = JSON.parse(error.body);
                if (body?.error?.data) {
                    return body.error.data;
                }
            } catch (e) {
                // Ignore JSON parsing errors
            }
        }
        
        return undefined;
    }

    /**
    * @private
    * Parses a contract error and returns a user-friendly message.
    */
    private _handleContractError(error: any): never {
        // Define known error selectors and their friendly messages
        const errorSignatures: { [key: string]: string } = {
            '0x514b6c24': 'Permission Denied: The connected wallet is not the admin for this upkeep.',
            '0x972dda13': 'Upkeep is already paused.',
            '0x729023c1': 'Upkeep is not paused.',
            '0xd305a542': 'Upkeep cannot be canceled because it is not paused.',
            '0xcf89f138': 'Upkeep is already canceled.',
            '0x263c3324': 'Insufficient LINK funds to perform upkeep.',
        };

        const revertData = this._findRevertData(error);

        if (revertData && errorSignatures[revertData]) {
            // If we find a known error, throw a new, clean error.
            throw new Error(errorSignatures[revertData]);
        }

        // If the error is unknown, re-throw the original error.
        throw new Error(`An unexpected contract error occurred: ${error.reason || error.message}`);
    }
}

