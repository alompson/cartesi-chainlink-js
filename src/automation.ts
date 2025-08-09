import { AutomationConfig, CreateUpkeepOptions, UpkeepInfo, IAutomationProvider } from './interfaces.js';
import { ChainlinkProvider } from './providers/chainlink.provider.js';
import { LocalProvider } from './providers/local.provider.js';

export class Automation {
    private _provider: IAutomationProvider;

    constructor(config: AutomationConfig) {
        const { signer, chainId, mode = 'chainlink' } = config;

        if (mode === 'chainlink') {
            this._provider = new ChainlinkProvider(signer, chainId);
        } else if (mode === 'local') {
            this._provider = new LocalProvider();
        } else {
            throw new Error(`Mode "${mode}" is not yet supported.`);
        }
    }

    /**
     * Registers a new upkeep with the configured provider (Chainlink or Local).
     */
    async createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string }> {
        return this._provider.createUpkeep(options);
    }

    /**
     * Retrieves the on-chain information for an existing upkeep.
     */
    async getUpkeep(upkeepId: string): Promise<UpkeepInfo> {
        return this._provider.getUpkeep(upkeepId);
    }

    /**
     * Adds more LINK funds to an existing upkeep.
     */
    async addFunds(upkeepId: string, amount: string): Promise<void> {
        return this._provider.addFunds(upkeepId, amount);
    }

    /**
     * Pauses a currently active upkeep.
     */
    async pauseUpkeep(upkeepId: string): Promise<void> {
        return this._provider.pauseUpkeep(upkeepId);
    }

    /**
     * Resumes a paused upkeep.
     */
    async unpauseUpkeep(upkeepId: string): Promise<void> {
        return this._provider.unpauseUpkeep(upkeepId);
    }

    /**
     * Cancels an upkeep permanently.
     */
    async cancelUpkeep(upkeepId: string): Promise<void> {
        return this._provider.cancelUpkeep(upkeepId);
    }
}

