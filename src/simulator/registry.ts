import { ethers, Wallet, providers } from 'ethers';
import { CreateUpkeepOptions, CreateLogUpkeepOptions, CreateCustomUpkeepOptions } from '../interfaces.js';
import { CustomLogicJob, IUpkeepJob, LogTriggerJob } from './jobs.js';

interface SimulatorConfig {
    rpcUrl: string;
    privateKey: string;
}

export class UpkeepRegistry {
    private _wallet: Wallet;
    private _provider: providers.Provider;
    private _activeJobs: Map<string, IUpkeepJob> = new Map();

    constructor(config: SimulatorConfig) {
        this._provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this._wallet = new ethers.Wallet(config.privateKey, this._provider);
        console.log(`[UpkeepRegistry] Initialized with wallet address: ${this._wallet.address}`);
    }

    public registerUpkeep(options: CreateUpkeepOptions): void {
        const contractAddress = options.upkeepContract;
        if (this._activeJobs.has(contractAddress)) {
            throw new Error(`Upkeep for contract ${contractAddress} is already registered.`);
        }

        try {
            console.log(`[Registry] Registering upkeep: ${options.name}`);

            let job: IUpkeepJob;
            if (options.triggerType === 'custom') {
                job = new CustomLogicJob(options as CreateCustomUpkeepOptions, this._wallet);
            } else if (options.triggerType === 'log') {
                // Add validation for log-specific options
                const logOptions = options as CreateLogUpkeepOptions;
                if (!logOptions.logEmitterAddress || !logOptions.logEventSignature) {
                    throw new Error("For log triggers, 'logEmitterAddress' and 'logEventSignature' are required.");
                }
                job = new LogTriggerJob(logOptions, this._wallet);
            } else {
                throw new Error(`Unsupported trigger type: ${(options as unknown as { triggerType: string }).triggerType}`);
            }

            this._activeJobs.set(contractAddress, job);
            job.start();
            
            console.log(`[Registry] Successfully registered and started job for ${options.name}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Registry] Failed to register upkeep for ${options.name}:`, errorMessage);
            // Re-throw to ensure the caller (e.g., the server) knows about the failure.
            throw error;
        }
    }

    public unregisterUpkeep(contractAddress: string): void {
        const job = this._activeJobs.get(contractAddress);
        if (job) {
            job.stop();
            this._activeJobs.delete(contractAddress);
            console.log(`[Registry] Stopped and unregistered upkeep for ${contractAddress}.`);
        } else {
            throw new Error(`No upkeep registered for contract ${contractAddress}.`);
        }
    }

    public getRegisteredUpkeepsCount(): number {
        return this._activeJobs.size;
    }
}
