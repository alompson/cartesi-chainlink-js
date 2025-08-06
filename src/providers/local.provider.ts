import axios from 'axios';
import { IAutomationProvider, CreateUpkeepOptions, UpkeepInfo } from '../interfaces';

const SIMULATOR_BASE_URL = 'http://localhost:7788';

export class LocalProvider implements IAutomationProvider {

    constructor() {
        // Check if the simulator is alive on startup
        this.getStatus().catch(err => {
            console.error('[LocalProvider] Could not connect to the local simulator service. Is it running?');
            console.error(`[LocalProvider] Please run 'npx run-local-simulator' in a separate terminal.`);
        });
    }

    private async getStatus(): Promise<void> {
        await axios.get(`${SIMULATOR_BASE_URL}/status`);
    }

    async createUpkeep(options: CreateUpkeepOptions): Promise<{ upkeepId: string }> {
        console.log(`[LocalProvider] Registering upkeep '${options.name}' with local simulator...`);
        await axios.post(`${SIMULATOR_BASE_URL}/register`, options);
        console.log(`[LocalProvider] Upkeep '${options.name}' registered successfully.`);
        // For local simulation, the "upkeepId" is simply the contract address
        return { upkeepId: options.upkeepContract };
    }

    async cancelUpkeep(upkeepId: string): Promise<void> {
        console.log(`[LocalProvider] Unregistering upkeep '${upkeepId}' from local simulator...`);
        await axios.post(`${SIMULATOR_BASE_URL}/unregister`, { upkeepContract: upkeepId });
        console.log(`[LocalProvider] Upkeep '${upkeepId}' unregistered successfully.`);
    }

    async getUpkeep(upkeepId: string): Promise<UpkeepInfo> {
        console.warn(`[LocalProvider] getUpkeep() does not return real on-chain data in local mode.`);
        // Return a mock object, as there's no real on-chain registry to query
        return {
            target: upkeepId,
            admin: '0x0000000000000000000000000000000000000000', // Mock data
            balance: '0',
            gasLimit: 0,
            isPaused: false,
            performData: '0x',
        };
    }

    async addFunds(upkeepId: string, amount: string): Promise<void> {
        console.log(`[LocalProvider] addFunds() is a no-op in local mode. Funding is not required.`);
        return Promise.resolve();
    }

    async pauseUpkeep(upkeepId: string): Promise<void> {
        console.warn(`[LocalProvider] pauseUpkeep() is not applicable in local mode. Use cancelUpkeep() instead.`);
        return Promise.resolve();
    }

    async unpauseUpkeep(upkeepId: string): Promise<void> {
        console.warn(`[LocalProvider] unpauseUpkeep() is not applicable in local mode.`);
        return Promise.resolve();
    }
} 