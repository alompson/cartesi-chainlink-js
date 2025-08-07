import axios from 'axios';
import { LocalProvider } from '../src/providers/local.provider';
import { CreateUpkeepOptions } from '../src/interfaces';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocalProvider', () => {
    let provider: LocalProvider;

    beforeEach(() => {
        provider = new LocalProvider();
        mockedAxios.post.mockClear();
        mockedAxios.get.mockClear();
    });

    describe('createUpkeep', () => {
        it('should call the /register endpoint and return the upkeepId', async () => {
            const options: CreateUpkeepOptions = {
                name: 'Test Upkeep',
                upkeepContract: '0x123',
                gasLimit: 500000,
                triggerType: 'custom',
                initialFunds: '0' 
            };
            mockedAxios.post.mockResolvedValue({ data: {} });

            const result = await provider.createUpkeep(options);

            expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7788/register', options);
            expect(result).toEqual({ upkeepId: '0x123' });
        });
    });

    describe('cancelUpkeep', () => {
        it('should call the /unregister endpoint', async () => {
            const upkeepId = '0x123';
            mockedAxios.post.mockResolvedValue({ data: {} });

            await provider.cancelUpkeep(upkeepId);

            expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:7788/unregister', { upkeepContract: upkeepId });
        });
    });

    describe('getUpkeep', () => {
        it('should return a mock object', async () => {
            const upkeepId = '0x123';
            const result = await provider.getUpkeep(upkeepId);

            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
            expect(typeof result.balance).toBe('string');
        });
    });

    describe('addFunds', () => {
        it('should be a no-op and resolve', async () => {
            await expect(provider.addFunds('0x123', '10')).resolves.toBeUndefined();
        });
    });

    describe('pauseUpkeep', () => {
        it('should be a no-op and resolve', async () => {
            await expect(provider.pauseUpkeep('0x123')).resolves.toBeUndefined();
        });
    });

    describe('unpauseUpkeep', () => {
        it('should be a no-op and resolve', async () => {
            await expect(provider.unpauseUpkeep('0x123')).resolves.toBeUndefined();
        });
    });
}); 