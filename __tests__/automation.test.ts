import { Automation } from '../src/automation';
import { ChainlinkProvider } from '../src/providers/chainlink.provider';
import { LocalProvider } from '../src/providers/local.provider';
import { Signer } from 'ethers';

jest.mock('../src/providers/chainlink.provider');
jest.mock('../src/providers/local.provider');

describe('Automation Class', () => {
    const mockSigner = {} as Signer;
    const mockChainId = 1;

    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        (ChainlinkProvider as jest.Mock).mockClear();
        (LocalProvider as jest.Mock).mockClear();
    });

    it("should instantiate ChainlinkProvider by default", () => {
        new Automation({ signer: mockSigner, chainId: mockChainId });
        expect(ChainlinkProvider).toHaveBeenCalledTimes(1);
        expect(LocalProvider).not.toHaveBeenCalled();
    });

    it("should instantiate ChainlinkProvider when mode is 'chainlink'", () => {
        new Automation({ signer: mockSigner, chainId: mockChainId, mode: 'chainlink' });
        expect(ChainlinkProvider).toHaveBeenCalledTimes(1);
        expect(LocalProvider).not.toHaveBeenCalled();
    });

    it("should instantiate LocalProvider when mode is 'local'", () => {
        new Automation({ signer: mockSigner, chainId: mockChainId, mode: 'local' });
        expect(LocalProvider).toHaveBeenCalledTimes(1);
        expect(ChainlinkProvider).not.toHaveBeenCalled();
    });

    it('should throw an error for an unsupported mode', () => {
        const unsupportedMode = 'unsupported' as any;
        expect(() => {
            new Automation({ signer: mockSigner, chainId: mockChainId, mode: unsupportedMode });
        }).toThrow(`Mode "${unsupportedMode}" is not yet supported.`);
    });
}); 