import { ContractInterface } from 'ethers';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Helper to resolve paths relative to the current module, which is crucial for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to load ABI JSON files robustly
function loadAbi(contractName: string): ContractInterface {
    // Navigate from dist/core -> node_modules
    const abiPath = path.resolve(
        __dirname,
        '../../node_modules/@chainlink/contracts/abi/v0.8/',
        `${contractName}.json`
    );
    try {
        const fileContent = fs.readFileSync(abiPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        console.error(`Failed to load ABI for ${contractName} at ${abiPath}`);
        throw e;
    }
}

// =================================================================
// ABIs
// =================================================================
const AutomationRegistrarV2_1_ABI = loadAbi('AutomationRegistrar2_1');
const AutomationRegistryV2_1_ABI = loadAbi('KeeperRegistry2_0');
const LinkTokenABI = loadAbi('LinkTokenInterface');


// =================================================================
// Network Configuration Interface
// =================================================================

/**
 * @title Network-Specific Configuration for Chainlink Automation
 * @notice Defines the contract addresses, ABIs, and operational parameters for each supported network.
 * @dev The 'registrarAbi' and 'registryAbi' are set to a common default but **must be verified** for each
 * specific network deployment, as different networks may run different contract versions.
 */
export interface AutomationNetworkConfig {
    name: string;
    chainId: number;
    linkTokenAddress: string;
    linkTokenAbi: ContractInterface;
    registrarAddress: string;
    registrarAbi: ContractInterface;
    registryAddress: string;
    registryAbi: ContractInterface;
    parameters: {
        paymentPremiumPPB: number;
        flatFeeMicroLink?: number; // Optional, not present on all networks
        checkGasLimit: number;
        performGasLimit: number;
        gasCeilingMultiplier: number;
        minUpkeepSpendLink: number;
        maxCheckDataSize: number | null; // Nullable for networks where it's not applicable
        maxPerformDataSize: number | null; // Nullable for networks where it's not applicable
        blockCountPerTurn?: number | null;
    };
}


// =================================================================
// Network Configuration Map
// =================================================================

// A map where the key is the chainId and the value is the complete network configuration.
export const chainlinkAutomationNetworks: Record<number, AutomationNetworkConfig> = {
    // ----------------- ETHEREUM -----------------
    1: { // Ethereum Mainnet
        name: 'Ethereum Mainnet',
        chainId: 1,
        linkTokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x6B0B234fB2f380309D47A7E9391E29E9a179395a',
        registryAddress: '0x6593c7De001fC8542bB1703532EE1E5aA0D458fD',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 20, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },
    11155111: { // Ethereum Sepolia
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        linkTokenAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976',
        registryAddress: '0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 20, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.0, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },

    // ----------------- ARBITRUM -----------------
    42161: { // Arbitrum One
        name: 'Arbitrum One',
        chainId: 42161,
        linkTokenAddress: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad',
        registryAddress: '0x37D9dC70bfcd8BC77Ec2858836B923c560E891D1',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 5, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },
    421614: { // Arbitrum Sepolia
        name: 'Arbitrum Sepolia',
        chainId: 421614,
        linkTokenAddress: '0xb1d4538B4571d411F07960EF2838Ce337FE1E80E',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x881918E24290084409DaA91979A30e6f0dB52eBe',
        registryAddress: '0x8194399B3f11fcA2E8cCEfc4c9A658c61B8Bf412',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 5, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },

    // ----------------- AVALANCHE -----------------
    43114: { // Avalanche Mainnet
        name: 'Avalanche Mainnet',
        chainId: 43114,
        linkTokenAddress: '0x5947BB275c521040051D82396192181b413227A3',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x5Cb7B29e621810Ce9a04Bee137F8427935795d00',
        registryAddress: '0x7f00a3Cd4590009C349192510D51F8e6312E08CB',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 40, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    43113: { // Avalanche Fuji Testnet
        name: 'Avalanche Fuji',
        chainId: 43113,
        linkTokenAddress: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xD23D3D1b81711D75E1012211f1b65Cc7dBB474e2',
        registryAddress: '0x819B58A646CDd8289275A87653a2aA4902b14fe6',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 40, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.0, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },

    // ----------------- BASE -----------------
    8453: { // Base Mainnet
        name: 'Base Mainnet',
        chainId: 8453,
        linkTokenAddress: '0x5f247B2163dbe5AB210f1424b420242542a487c8',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xE28Adc50c7551CFf69FCF32D45d037e5F6554264',
        registryAddress: '0xf4bAb6A129164aBa9B113cB96BA4266dF49f8743',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 5, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },
    84532: { // Base Sepolia
        name: 'Base Sepolia',
        chainId: 84532,
        linkTokenAddress: '0xE493441703823A4138246A14A57143A3A8A99a49',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xf28D56F3A707E25B71Ce529a21AF388751E1CF2A',
        registryAddress: '0x91D4a4C3D448c7f3CB477332B1c7D420a5810aC3',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 1_000, blockCountPerTurn: null }
    },

    // ----------------- BNB CHAIN -----------------
    56: { // BNB Chain Mainnet
        name: 'BNB Chain',
        chainId: 56,
        linkTokenAddress: '0x404460C6A5EDE54C6E926650A862052B855B68e3',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xf671F60bCC964B309D22424886FF202807381B32',
        registryAddress: '0xDc21E279934fF6721CaDfDD112DAfb3261f09A2C',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 30, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    97: { // BNB Chain Testnet
        name: 'BNB Chain Testnet',
        chainId: 97,
        linkTokenAddress: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x0631ea498c2Cd8371B020b9eC03f5F779174562B',
        registryAddress: '0x96bb60aAAec09A0FceB4527b81bbF3Cc0c171393',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 30, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.0, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },

    // ----------------- FANTOM -----------------
    250: { // Fantom Mainnet
        name: 'Fantom Mainnet',
        chainId: 250,
        linkTokenAddress: '0x6F43FF822DB9b52b3de72439D2D22f474674179A',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xDb8e8e2ccb5C033938736aa89Fe4fa1eDfD15a1d',
        registryAddress: '0x02777053d6764996e594c3E88AF1D58D5363a2e6',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, checkGasLimit: 10_000_000, performGasLimit: 3_500_000, gasCeilingMultiplier: 4, minUpkeepSpendLink: 0.1, maxCheckDataSize: null, maxPerformDataSize: null, blockCountPerTurn: 50 }
    },
    4002: { // Fantom Testnet
        name: 'Fantom Testnet',
        chainId: 4002,
        linkTokenAddress: '0xfaFedb041c0DD4fA2Dc0d87a6B0979Ee6FA7af5F',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x57A4a13b35d25EE78e084168aBaC5ad360252467',
        registryAddress: '0x8Ef7AC62dc3a4FF4dcc0441ed098106f8F313220',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 3_500_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.0, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: 200 }
    },

    // ----------------- GNOSIS -----------------
    100: { // Gnosis Mainnet
        name: 'Gnosis Mainnet',
        chainId: 100,
        linkTokenAddress: '0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x0F7E163446AAb41DB5375AbdeE2c3eCC56D9aA32',
        registryAddress: '0x299c92a219F61a82E91d2062A262f7157F155AC1',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 100, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    10200: { // Gnosis Chiado Testnet
        name: 'Gnosis Chiado',
        chainId: 10200,
        linkTokenAddress: '0x1A67863350222475A1F1a2a40731A127a908249C',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xcfB98e8E3AB99217a0E61C29f86ba3a4B79037BF',
        registryAddress: '0x2CA3BC9eC81E9647e7f8e7EdFE630a27A4E470dB',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 30, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },

    // ----------------- OPTIMISM -----------------
    10: { // Optimism Mainnet
        name: 'Optimism Mainnet',
        chainId: 10,
        linkTokenAddress: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638556AF0',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0xe601C5837307f07aB39DEB0f5516602f045BF14f',
        registryAddress: '0x696fB0d7D069cc0bb35a7c36115CE63E55cb9AA6',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 5, minUpkeepSpendLink: 0.02, maxCheckDataSize: 5_000, maxPerformDataSize: 1_000, blockCountPerTurn: null }
    },
    11155420: { // Optimism Sepolia
        name: 'Optimism Sepolia',
        chainId: 11155420,
        linkTokenAddress: '0x49f44633b4533E6091D555057429154a4f738019',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x110Bd89F0B62EA1598FfeBF8C0304c9e58510Ee5',
        registryAddress: '0x881918E24290084409DaA91979A30e6f0dB52eBe',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 5, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 2_000, blockCountPerTurn: null }
    },

    // ----------------- POLYGON -----------------
    137: { // Polygon Mainnet
        name: 'Polygon Mainnet',
        chainId: 137,
        linkTokenAddress: '0x53e0bca35ec356bd5dddfebc7a3c1a24d989e820',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x0Bc5EDC7219D272d9dEDd919CE2b4726129AC02B',
        registryAddress: '0x08a8eea76D2395807Ce7D1FC942382515469cCA1',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 70, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 3, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    // 80002 is Polygon Amoy, already included above

    // ----------------- POLYGON ZKEVM -----------------
    1101: { // Polygon zkEVM Mainnet
        name: 'Polygon zkEVM',
        chainId: 1101,
        linkTokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Note: Uses bridged LINK
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x703C1d261a996755409c74d00871e7D6Af4d9896',
        registryAddress: '0x0F7E163446AAb41DB5375AbdeE2c3eCC56D9aA32',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 56, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.0004, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    1442: { // Polygon zkEVM Cardona Testnet
        name: 'Polygon zkEVM Cardona',
        chainId: 1442,
        linkTokenAddress: '0x9E44B04F25b413158304E0Ea03bA53232236A3D6',
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x703C1d261a996755409c74d00871e7D6Af4d9896',
        registryAddress: '0x0F7E163446AAb41DB5375AbdeE2c3eCC56D9aA32',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.0004, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },

    // ----------------- SCROLL -----------------
    534352: { // Scroll Mainnet
        name: 'Scroll',
        chainId: 534352,
        linkTokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Note: Uses bridged LINK
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x80C55e674a34FfE730B0357E16e8852B19573f7C',
        registryAddress: '0xBe55E7eb27Cd69Be0883E0284632A91bB7AdC272',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 56, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.0004, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    },
    534351: { // Scroll Sepolia
        name: 'Scroll Sepolia',
        chainId: 534351,
        linkTokenAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Note: Uses Sepolia LINK
        linkTokenAbi: LinkTokenABI,
        registrarAddress: '0x8ee44ab698169a0AcA2571834b19a02d09D818d5',
        registryAddress: '0x93C0e201f7B158F503a1265B6942088975f92ce7',
        registrarAbi: AutomationRegistrarV2_1_ABI,
        registryAbi: AutomationRegistryV2_1_ABI,
        parameters: { paymentPremiumPPB: 50, flatFeeMicroLink: 0, checkGasLimit: 10_000_000, performGasLimit: 5_000_000, gasCeilingMultiplier: 2, minUpkeepSpendLink: 0.1, maxCheckDataSize: 5_000, maxPerformDataSize: 5_000, blockCountPerTurn: null }
    }
};


// =================================================================
// Helper Function
// =================================================================

/**
 * Retrieves the automation configuration for a given chain ID.
 * @param chainId The chain ID of the desired network.
 * @returns The configuration object for the specified network.
 * @throws An error if the chain ID is not supported by the library.
 */
export const getAutomationNetworkConfig = (chainId: number): AutomationNetworkConfig => {
    const config = chainlinkAutomationNetworks[chainId];
    if (!config) {
        throw new Error(`Chainlink Automation is not supported on chainId '${chainId}' by this library.`);
    }
    return config;
};
