import { ethers, Signer, Contract, ContractReceipt } from 'ethers';
import { getAutomationNetworkConfig } from '../core/networks.js';
import { CreateUpkeepOptions, UpkeepInfo, IAutomationProvider, CreateLogUpkeepOptions } from '../interfaces.js';

// A map of known error selectors to human-readable messages
const REVERT_SELECTORS: { [key: string]: string } = {
    '0x8baa579f': 'Insufficient LINK funds to fulfill the request.',
    '0x6354999f': 'The upkeep is not active.',
    '0x0274e761': 'The upkeep is already registered.',
    '0x514b6c24': 'Permission Denied: The connected wallet is not the admin for this upkeep.',
    '0x972dda13': 'Upkeep is already paused.',
    '0x729023c1': 'Upkeep is not paused.',
    '0xd305a542': 'Upkeep cannot be canceled because it is not paused.',
    '0xcf89f138': 'Upkeep is already canceled.',
    '0x263c3324': 'Insufficient LINK funds to perform upkeep.',
};

export class ChainlinkProvider implements IAutomationProvider {
    private _signer: Signer;
    private _linkToken: Contract;
    private _registry: Contract;
    private _registrar: Contract;
    private _networkConfig: ReturnType<typeof getAutomationNetworkConfig>;

    constructor(signer: Signer, chainId: number) {
        this._signer = signer;
        this._networkConfig = getAutomationNetworkConfig(chainId);

        const {
            registrarAddress,
            registrarAbi,
            registryAddress,
            registryAbi,
            linkTokenAddress,
            linkTokenAbi,
        } = this._networkConfig;

        this._linkToken = new ethers.Contract(linkTokenAddress, linkTokenAbi, signer);
        this._registry = new ethers.Contract(registryAddress, registryAbi, signer);
        this._registrar = new ethers.Contract(registrarAddress, registrarAbi, signer);
    }

    async createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string; }> {
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
                adminAddress: await this._signer.getAddress(),
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
        } catch (_error: unknown) {
            this._handleContractError(_error, 'createUpkeep');
        }
    }

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
        } catch (_error: unknown) {
            this._handleContractError(_error, 'getUpkeep');
        }
    }

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
        } catch (_error: unknown) {
            this._handleContractError(_error, 'addFunds');
        }
    }

    async pauseUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Pausing upkeep ${upkeepId}...`);
            const tx = await this._registry.pauseUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep paused.');
        } catch (_error: unknown) {
            this._handleContractError(_error, 'pauseUpkeep');
        }
    }

    async unpauseUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Unpausing upkeep ${upkeepId}...`);
            const tx = await this._registry.unpauseUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep unpaused and is now active.');
        } catch (_error: unknown) {
            this._handleContractError(_error, 'unpauseUpkeep');
        }
    }

    async cancelUpkeep(upkeepId: string): Promise<void> {
        try {
            console.log(`Canceling upkeep ${upkeepId}...`);
            const tx = await this._registry.cancelUpkeep(upkeepId);
            await tx.wait();
            console.log('✅ Upkeep canceled.');
        } catch (_error: unknown) {
            // Re-throw with a more descriptive message
            this._handleContractError(_error, 'cancelUpkeep');
        }
    }

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

    private _parseUpkeepIdFromReceipt(receipt: ContractReceipt): string {
        const eventName = 'UpkeepRegistered';

        for (const log of receipt.logs) {
            if (log.address === this._registry.address) {
                try {
                    const parsedLog = this._registry.interface.parseLog(log);
                    if (parsedLog.name === eventName) {
                        return parsedLog.args.id.toString();
                    }
                } catch {
                    // This log might not be from the registry, so we can ignore the error
                }
            }
        }
        throw new Error('Could not find the UpkeepRegistered event in the transaction receipt.');
    }

    private _findRevertData(error: unknown): string | undefined {
        if (!error || typeof error !== 'object') return undefined;
        const err = error as Record<string, unknown>;
        
        // Direct data field (e.g., revert data)
        const data = err.data;
        if (typeof data === 'string' && data.startsWith('0x')) return data;
        
        // Nested provider error
        if (typeof err.error === 'object' && err.error !== null) {
            return this._findRevertData(err.error);
        }
        
        // JSON-RPC body (stringified)
        if (typeof err.body === 'string') {
            try {
            const body = JSON.parse(err.body) as { error?: { data?: unknown } };
            const bd = body?.error?.data;
            if (typeof bd === 'string') return bd;
            } catch {
            // ignore parse errors
            }
        }
        return undefined;
    }
      
    private _handleContractError(error: unknown, context: string): never {
    // Map known revert selectors first
    const selector = this._findRevertData(error);
    if (selector && REVERT_SELECTORS[selector]) {
        throw new Error(`Error during ${context}: ${REVERT_SELECTORS[selector]}`);
    }
    
    // Fallbacks: reason → message → generic
    if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        const reason = err.reason;
        if (typeof reason === 'string') {
        throw new Error(`Error during ${context}: ${reason}`);
        }
        const message = err.message;
        if (typeof message === 'string') {
        throw new Error(`Error during ${context}: ${message}`);
        }
    }
    
    throw new Error(`Error during ${context}: An unknown error occurred`);
    }
} 