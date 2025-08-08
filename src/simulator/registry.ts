import { ethers } from 'ethers';
import { CreateUpkeepOptions, CreateCustomUpkeepOptions, CreateLogUpkeepOptions } from '../interfaces';
import { IUpkeepJob, CustomLogicJob, LogTriggerJob } from './jobs';

interface SimulatorConfig {
    rpcUrl: string;
    privateKey: string;
}

export class UpkeepRegistry {
    private _jobs: Map<string, IUpkeepJob> = new Map();
    private _signer: ethers.Wallet;

    constructor(config: SimulatorConfig) {
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this._signer = new ethers.Wallet(config.privateKey, provider);
        console.log(`[Registry] Initialized with signer: ${this._signer.address}`);
        console.log(`[Registry] Connected to RPC: ${config.rpcUrl}`);
    }

    public registerUpkeep(options: CreateUpkeepOptions): void {
        const contractAddress = options.upkeepContract;
        if (this._jobs.has(contractAddress)) {
            throw new Error(`Upkeep for contract ${contractAddress} is already registered.`);
        }

        try {
            console.log(`[Registry] Registering upkeep: ${options.name}`);

            let job: IUpkeepJob;
            if (options.triggerType === 'custom') {
                job = new CustomLogicJob(options as CreateCustomUpkeepOptions, this._signer);
            } else if (options.triggerType === 'log') {
                // Add validation for log-specific options
                const logOptions = options as CreateLogUpkeepOptions;
                if (!logOptions.logEmitterAddress || !logOptions.logEventSignature) {
                    throw new Error("For log triggers, 'logEmitterAddress' and 'logEventSignature' are required.");
                }
                job = new LogTriggerJob(logOptions, this._signer);
            } else {
                throw new Error(`Unsupported trigger type: ${(options as unknown as { triggerType: string }).triggerType}`);
            }

            this._jobs.set(contractAddress, job);
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
        const job = this._jobs.get(contractAddress);
        if (job) {
            job.stop();
            this._jobs.delete(contractAddress);
            console.log(`[Registry] Stopped and unregistered upkeep for ${contractAddress}.`);
        } else {
            throw new Error(`No upkeep registered for contract ${contractAddress}.`);
        }
    }

    public getRegisteredUpkeepsCount(): number {
        return this._jobs.size;
    }
}
