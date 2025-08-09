import { Automation } from '../src/automation';
import { ethers, Wallet } from 'ethers';

describe('Automation Class', () => {
    // Create a proper mock signer for testing
    const mockProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const mockSigner = new Wallet('0x0000000000000000000000000000000000000000000000000000000000000001', mockProvider);
    const mockChainId = 31337; // Use local chainId to avoid network calls

    it('should throw an error for an unsupported mode', () => {
        const unsupportedMode = 'unsupported' as 'chainlink' | 'local';
        expect(() => {
            new Automation({ signer: mockSigner, chainId: mockChainId, mode: unsupportedMode });
        }).toThrow(`Mode "${unsupportedMode}" is not yet supported.`);
    });

    it('should be instantiable in local mode', () => {
        expect(() => {
            new Automation({ signer: mockSigner, chainId: mockChainId, mode: 'local' });
        }).not.toThrow();
    });

    it('should default to chainlink mode when no mode is specified', () => {
        // Test that it defaults to chainlink mode and doesn't throw
        expect(() => {
            new Automation({ signer: mockSigner, chainId: 1 }); // Mainnet chainId
        }).not.toThrow();
    });

    it('should handle chainlink mode explicitly', () => {
        // Test that it accepts chainlink mode explicitly and doesn't throw
        expect(() => {
            new Automation({ signer: mockSigner, chainId: 1, mode: 'chainlink' }); // Mainnet chainId
        }).not.toThrow();
    });
}); 