import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Create mocks up front (ESM-safe)
const mockGet = jest.fn();
const mockPost = jest.fn();

// In ESM, you must register the mock before importing the module-under-test.
await (jest as any).unstable_mockModule('axios', () => {
  return {
    // default export
    default: {
      get: mockGet,
      post: mockPost,
    },
    // named exports (some bundlers re-export these)
    get: mockGet,
    post: mockPost,
  };
});

// Now import the SUT after the mock is in place
const { LocalProvider } = await import('../src/providers/local.provider');

describe('LocalProvider (ESM + axios mocked)', () => {
  beforeAll(() => {
    // Avoid noisy console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();

    // Default the healthcheck to succeed so the constructor doesn't log errors
    mockGet.mockResolvedValue({ data: { status: 'ok' } } as never);
  });

  it('constructor pings /status on the simulator', async () => {
    const provider = new LocalProvider();
    // give the constructor’s .then a tick
    await Promise.resolve();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('http://localhost:7788/status');
    expect(provider).toBeInstanceOf(LocalProvider);
  });

  describe('createUpkeep', () => {
    it('calls /register and returns upkeepId (contract address)', async () => {
      const provider = new LocalProvider();
      await Promise.resolve(); // let healthcheck settle

      const options = {
        name: 'Test Upkeep',
        upkeepContract: '0xabcDEF123',
        gasLimit: 500_000,
        triggerType: 'custom' as const,
        initialFunds: '0',
      };

      mockPost.mockResolvedValueOnce({ data: {} } as never);

      const result = await provider.createUpkeep(options);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('http://localhost:7788/register', options);
      expect(result).toEqual({ upkeepId: '0xabcDEF123' });
    });
  });

  describe('cancelUpkeep', () => {
    it('calls /unregister with upkeepContract payload', async () => {
      const provider = new LocalProvider();
      await Promise.resolve();

      mockPost.mockResolvedValueOnce({ data: {} } as never);

      const upkeepId = '0x123';
      await provider.cancelUpkeep(upkeepId);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('http://localhost:7788/unregister', { upkeepContract: upkeepId });
    });
  });

  describe('getUpkeep', () => {
    it('returns a mock object (no real on-chain data)', async () => {
      const provider = new LocalProvider();
      await Promise.resolve();

      const upkeepId = '0x123';
      const result = await provider.getUpkeep(upkeepId);

      expect(result).toEqual(
        expect.objectContaining({
          target: upkeepId,
          admin: expect.any(String),
          balance: expect.any(String),
          gasLimit: expect.any(Number),
          isPaused: expect.any(Boolean),
          performData: expect.any(String),
        })
      );
    });
  });

  describe('addFunds', () => {
    it('is a no-op that resolves', async () => {
      const provider = new LocalProvider();
      await Promise.resolve();

      await expect(provider.addFunds('0x123', '10')).resolves.toBeUndefined();
    });
  });

  describe('pauseUpkeep', () => {
    it('is a no-op that resolves', async () => {
      const provider = new LocalProvider();
      await Promise.resolve();

      await expect(provider.pauseUpkeep('0x123')).resolves.toBeUndefined();
    });
  });

  describe('unpauseUpkeep', () => {
    it('is a no-op that resolves', async () => {
      const provider = new LocalProvider();
      await Promise.resolve();

      await expect(provider.unpauseUpkeep('0x123')).resolves.toBeUndefined();
    });
  });

  it('constructor handles /status failure gracefully', async () => {
    mockGet.mockReset();
    mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED') as never);

    const provider = new LocalProvider();
    await Promise.resolve();

    // Even on failure, constructor should not throw
    expect(provider).toBeInstanceOf(LocalProvider);
    expect(mockGet).toHaveBeenCalledWith('http://localhost:7788/status');
  });
});
