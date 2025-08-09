import { jest } from '@jest/globals';
import { LocalProvider } from '../src/providers/local.provider';
import { CreateUpkeepOptions } from '../src/interfaces';

// Create the mock functions first
const mockGet = jest.fn();
const mockPost = jest.fn();

// Mock axios module
jest.mock('axios', () => ({
    default: {
        get: mockGet,
        post: mockPost
    },
    get: mockGet,
    post: mockPost
}));

describe('LocalProvider', () => {
    let provider: LocalProvider;

    beforeEach(() => {
        provider = new LocalProvider();
        mockGet.mockClear();
        mockPost.mockClear();
    });

    describe('createUpkeep', () => {
        it.skip('should call the /register endpoint and return the upkeepId', async () => {
            const options: CreateUpkeepOptions = {
                name: 'Test Upkeep',
                upkeepContract: '0x123',
                gasLimit: 500000,
                triggerType: 'custom',
                initialFunds: '0' 
            };
            mockPost.mockResolvedValue({ data: {} } as never);

            const result = await provider.createUpkeep(options);

            expect(mockPost).toHaveBeenCalledWith('http://localhost:7788/register', options);
            expect(result).toEqual({ upkeepId: '0x123' });
        });
    });

    describe('cancelUpkeep', () => {
        it.skip('should call the /unregister endpoint', async () => {
            const upkeepId = '0x123';
            mockPost.mockResolvedValue({ data: {} } as never);

            await provider.cancelUpkeep(upkeepId);

            expect(mockPost).toHaveBeenCalledWith('http://localhost:7788/unregister', { upkeepContract: upkeepId });
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