import { ethers, ContractReceipt, Contract, Signer } from 'ethers';
import { CreateUpkeepOptions, CreateLogUpkeepOptions, UpkeepInfo, IAutomationProvider } from '../interfaces';
import { getAutomationNetworkConfig } from '../core/networks';

export class ChainlinkProvider implements IAutomationProvider {
    private _signer: Signer;
    private _networkConfig: ReturnType<typeof getAutomationNetworkConfig>;
    
    // Private properties to hold the instantiated contract objects
    private _registrar: Contract;
    private _registry: Contract;
    private _linkToken: Contract;

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
        
        this._registrar = new ethers.Contract(registrarAddress, registrarAbi, this._signer);
        this._registry = new ethers.Contract(registryAddress, registryAbi, this._signer);
        this._linkToken = new ethers.Contract(linkTokenAddress, linkTokenAbi, this._signer);
    }

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
        } catch (error) {
            this._handleContractError(error);
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
        } catch (error) {
            this._handleContractError(error);
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
        } catch (error) {
            this._handleContractError(error);
        }
    }

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
                } catch (error) {
                    // This log was not the one we were looking for, continue
                }
            }
        }
        throw new Error(`Could not find the ${eventName} event in the transaction receipt.`);
    }

    private _findRevertData(error: any): string | undefined {
        if (!error) return undefined;
        if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
            return error.data;
        }
        if (error.error) {
            return this._findRevertData(error.error);
        }
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

    private _handleContractError(error: any): never {
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
            throw new Error(errorSignatures[revertData]);
        }
        throw new Error(`An unexpected contract error occurred: ${error.reason || error.message}`);
    }
} 