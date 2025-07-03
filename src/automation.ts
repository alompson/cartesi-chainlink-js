import { ethers, ContractReceipt, Contract } from 'ethers';
import { AutomationConfig, CreateUpkeepOptions, CreateLogUpkeepOptions, UpkeepInfo } from './interfaces';
import { getAutomationNetworkConfig } from './core/networks';

export class Automation {
    private config: AutomationConfig;
    private networkConfig: ReturnType<typeof getAutomationNetworkConfig>;
    
    // Private properties to hold the instantiated contract objects
    private registrar: Contract;
    private registry: Contract;
    private linkToken: Contract;

    constructor(config: AutomationConfig) {
        this.config = config;
        this.networkConfig = getAutomationNetworkConfig(config.chainId);

        const {
            registrarAddress,
            registrarAbi,
            registryAddress,
            registryAbi,
            linkTokenAddress,
            linkTokenAbi,
        } = this.networkConfig;
        
        // Initialize all contract objects once and store them
        this.registrar = new ethers.Contract(registrarAddress, registrarAbi, this.config.signer);
        this.registry = new ethers.Contract(registryAddress, registryAbi, this.config.signer);
        this.linkToken = new ethers.Contract(linkTokenAddress, linkTokenAbi, this.config.signer);
    }

    /**
     * Registers a new Chainlink Automation upkeep.
     */
    async createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string }> {
        const fundsInWei = ethers.utils.parseEther(options.initialFunds);

        console.log(`Approving ${options.initialFunds} LINK for the registrar...`);
        const approveTx = await this.linkToken.approve(this.networkConfig.registrarAddress, fundsInWei);
        await approveTx.wait();
        console.log('Approval successful.');

        const registrationParams = {
            name: options.name,
            upkeepContract: options.upkeepContract,
            gasLimit: options.gasLimit,
            adminAddress: await this.config.signer.getAddress(),
            triggerType: options.triggerType === 'log' ? 1 : 0,
            checkData: options.checkData || '0x',
            triggerConfig: this.encodeTriggerConfig(options),
            offchainConfig: options.offchainConfig || '0x',
            amount: fundsInWei,
        };

        console.log('Registering upkeep...');
        const registerTx = await this.registrar.registerUpkeep(registrationParams);
        const receipt = await registerTx.wait();
        
        const upkeepId = this.parseUpkeepIdFromReceipt(receipt);
        console.log(`✅ Upkeep registered successfully! Upkeep ID: ${upkeepId}`);

        return { upkeepId };
    }

    /**
     * Retrieves the on-chain information for an existing upkeep.
     */
    async getUpkeep(upkeepId: string): Promise<UpkeepInfo> {
        const upkeepData = await this.registry.getUpkeep(upkeepId);
        return {
            target: upkeepData.target,
            admin: upkeepData.admin,
            balance: ethers.utils.formatEther(upkeepData.balance),
            gasLimit: upkeepData.gasLimit,
            isPaused: upkeepData.paused,
            performData: upkeepData.performData,
        };
    }

    /**
     * Adds more LINK funds to an existing upkeep.
     */
    async addFunds(upkeepId: string, amount: string): Promise<void> {
        const amountInWei = ethers.utils.parseEther(amount);
        
        console.log(`Approving ${amount} LINK to be spent by the Registry...`);
        const approveTx = await this.linkToken.approve(this.networkConfig.registryAddress, amountInWei);
        await approveTx.wait();
        console.log('Approval successful.');

        console.log(`Adding ${amount} LINK to upkeep ${upkeepId}...`);
        const addFundsTx = await this.registry.addFunds(upkeepId, amountInWei);
        await addFundsTx.wait();
        console.log('✅ Funds added successfully!');
    }

    /**
     * Pauses a currently active upkeep.
     */
    async pauseUpkeep(upkeepId: string): Promise<void> {
        console.log(`Pausing upkeep ${upkeepId}...`);
        const tx = await this.registry.pauseUpkeep(upkeepId);
        await tx.wait();
        console.log('✅ Upkeep paused.');
    }

    /**
     * Resumes a paused upkeep.
     */
    async unpauseUpkeep(upkeepId: string): Promise<void> {
        console.log(`Unpausing upkeep ${upkeepId}...`);
        const tx = await this.registry.unpauseUpkeep(upkeepId);
        await tx.wait();
        console.log('✅ Upkeep unpaused and is now active.');
    }

    /**
     * Cancels an upkeep permanently.
     */
    async cancelUpkeep(upkeepId: string): Promise<void> {
        console.log(`Canceling upkeep ${upkeepId}...`);
        const tx = await this.registry.cancelUpkeep(upkeepId);
        await tx.wait();
        console.log('✅ Upkeep canceled.');
    }

    /**
     * @private
     * Encodes the trigger-specific configuration into the bytes format.
     */
    private encodeTriggerConfig(options: CreateUpkeepOptions): string {
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
    private parseUpkeepIdFromReceipt(receipt: ContractReceipt): string {
        const eventName = 'UpkeepRegistered';
        const upkeepRegisteredEvent = receipt.events?.find(e => e.event === eventName);

        if (!upkeepRegisteredEvent || !upkeepRegisteredEvent.args) {
            throw new Error(`Could not find the ${eventName} event in the transaction receipt.`);
        }

        return upkeepRegisteredEvent.args.id.toString();
    }
}