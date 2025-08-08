
import { BigNumber, ethers, Signer, ContractReceipt } from 'ethers';
import { ChainlinkProvider } from '../src/providers/chainlink.provider';
import { getAutomationNetworkConfig } from '../src/core/networks';
import { CreateCustomUpkeepOptions } from '../src/interfaces';

type LinkTokenStub = { address: string; approve: jest.Mock };
type RegistrarStub = { address: string; registerUpkeep: jest.Mock };
type RegistryStub = {
  address: string;
  getUpkeep: jest.Mock;
  addFunds: jest.Mock;
  pauseUpkeep: jest.Mock;
  unpauseUpkeep: jest.Mock;
  cancelUpkeep: jest.Mock;
  interface: { parseLog: jest.Mock };
};

describe('ChainlinkProvider', () => {
  const chainId = 11155111; // Ethereum Sepolia in our config
  const networkConfig = getAutomationNetworkConfig(chainId);

  // Fake signer that returns a constant admin address
  const adminAddress = '0x00000000000000000000000000000000DeaDBeef';
  const fakeSigner = {
    getAddress: jest.fn(() => Promise.resolve(adminAddress)),
  } as unknown as Signer;

  // Stubs for contracts
  let stubRegistrar: RegistrarStub;
  let stubRegistry: RegistryStub;
  let stubLinkToken: LinkTokenStub;

  // A fake receipt whose log address matches registryAddress
  const fakeLog = { address: networkConfig.registryAddress, data: '0x' };
  const fakeReceipt = ({ logs: [fakeLog] } as unknown) as ContractReceipt;

  // Helper to create a tx stub
  const makeTxStub = (receipt?: ContractReceipt) => ({
    wait: jest.fn(() => Promise.resolve(receipt)),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Stub LINK token contract
    stubLinkToken = {
      address: networkConfig.linkTokenAddress,
      approve: jest.fn().mockReturnValue(makeTxStub()),
    };

    // Stub Registrar contract
    stubRegistrar = {
      address: networkConfig.registrarAddress,
      registerUpkeep: jest.fn().mockReturnValue(makeTxStub(fakeReceipt)),
    };

    // Stub Registry contract
    stubRegistry = {
      address: networkConfig.registryAddress,
      getUpkeep: jest.fn().mockResolvedValue({
        target: '0xTarget',
        admin: '0xAdmin',
        balance: BigNumber.from('2500000000000000000'), // 2.5 ETH
        gasLimit: 12345,
        paused: true,
        performData: '0xdead',
      }),
      addFunds: jest.fn().mockReturnValue(makeTxStub()),
      pauseUpkeep: jest.fn().mockReturnValue(makeTxStub()),
      unpauseUpkeep: jest.fn().mockReturnValue(makeTxStub()),
      cancelUpkeep: jest.fn().mockReturnValue(makeTxStub()),
      interface: {
        parseLog: jest.fn().mockReturnValue({
          name: 'UpkeepRegistered',
          args: { id: BigNumber.from(42) },
        }),
      },
    };

    // Spy on ethers.Contract and cast to jest.Mock to allow mockImplementation
    const contractSpy = jest.spyOn(
      (ethers as unknown as { Contract: jest.Mock }),
      'Contract'
    ) as unknown as jest.Mock;

    contractSpy.mockImplementation((...args: unknown[]) => {
      const address = args[0] as string;
      if (address === networkConfig.registrarAddress) return stubRegistrar;
      if (address === networkConfig.registryAddress) return stubRegistry;
      if (address === networkConfig.linkTokenAddress) return stubLinkToken;
      throw new Error(`Unexpected contract address: ${address}`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('constructor instantiates three contracts with correct addresses', () => {
    // Use (ethers as any).Contract as a Jest mock
    const contractMock = (ethers as unknown as { Contract: jest.Mock }).Contract as jest.Mock;

    new ChainlinkProvider(fakeSigner, chainId);
    const calledAddresses = contractMock.mock.calls.map(call => call[0]);
    expect(calledAddresses).toHaveLength(3);
    expect(calledAddresses).toEqual(expect.arrayContaining([
      networkConfig.registrarAddress,
      networkConfig.registryAddress,
      networkConfig.linkTokenAddress,
    ]));
  });

  it('createUpkeep calls approve and registerUpkeep and parses upkeepId', async () => {
    const provider = new ChainlinkProvider(fakeSigner, chainId);
    const options: CreateCustomUpkeepOptions = {
      name: 'TestUpkeep',
      upkeepContract: '0xUpkeepContract',
      triggerType: 'custom',
      gasLimit: 500_000,
      initialFunds: '1.5',
    };

    const { upkeepId } = await provider.createUpkeep(options);

    expect(stubLinkToken.approve).toHaveBeenCalledWith(
      networkConfig.registrarAddress,
      ethers.utils.parseEther('1.5')
    );
    expect(stubRegistrar.registerUpkeep).toHaveBeenCalled();
    expect(upkeepId).toBe('42');
  });

  it('getUpkeep returns formatted UpkeepInfo', async () => {
    const provider = new ChainlinkProvider(fakeSigner, chainId);
    const info = await provider.getUpkeep('0xSomeId');

    expect(stubRegistry.getUpkeep).toHaveBeenCalledWith('0xSomeId');
    expect(info).toEqual({
      target: '0xTarget',
      admin: '0xAdmin',
      balance: '2.5',
      gasLimit: 12345,
      isPaused: true,
      performData: '0xdead',
    });
  });

  it('addFunds approves LINK and calls registry.addFunds', async () => {
    const provider = new ChainlinkProvider(fakeSigner, chainId);
    await provider.addFunds('0xSomeId', '0.75');

    expect(stubLinkToken.approve).toHaveBeenCalledWith(
      networkConfig.registryAddress,
      ethers.utils.parseEther('0.75')
    );
    expect(stubRegistry.addFunds).toHaveBeenCalledWith(
      '0xSomeId',
      ethers.utils.parseEther('0.75')
    );
  });

  it('pauseUpkeep, unpauseUpkeep, cancelUpkeep call registry methods', async () => {
    const provider = new ChainlinkProvider(fakeSigner, chainId);

    await provider.pauseUpkeep('ID1');
    expect(stubRegistry.pauseUpkeep).toHaveBeenCalledWith('ID1');

    await provider.unpauseUpkeep('ID2');
    expect(stubRegistry.unpauseUpkeep).toHaveBeenCalledWith('ID2');

    await provider.cancelUpkeep('ID3');
    expect(stubRegistry.cancelUpkeep).toHaveBeenCalledWith('ID3');
  });

  it('_handleContractError maps known and unknown errors correctly', () => {
    const providerPriv = new ChainlinkProvider(fakeSigner, chainId) as unknown as {
      _handleContractError: (e: unknown, c: string) => never;
    };
    expect(() =>
      providerPriv._handleContractError({ data: '0x514b6c24' }, 'pauseUpkeep')
    ).toThrow('Permission Denied: The connected wallet is not the admin for this upkeep.');

    expect(() =>
      providerPriv._handleContractError(new Error('random failure'), 'test')
    ).toThrow('Error during test: random failure');
  });
});
