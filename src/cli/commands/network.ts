import type { Argv } from 'yargs';
import { ethers } from 'ethers';
import { getAutomationNetworkConfig } from '../../core/networks.js';

interface NetworkTestArgs {
  rpcUrl?: string;
  timeout?: number;
}

interface NetworkShowArgs {
  chainId: number;
}

// Common network configurations
const COMMON_NETWORKS: Record<string, { name: string; chainId: number; rpcUrl: string; mode: 'local' | 'chainlink' }> = {
  local: { name: 'Local Development', chainId: 31337, rpcUrl: 'http://127.0.0.1:8545', mode: 'local' },
  sepolia: { name: 'Ethereum Sepolia', chainId: 11155111, rpcUrl: 'https://rpc.ankr.com/eth_sepolia', mode: 'chainlink' },
  mainnet: { name: 'Ethereum Mainnet', chainId: 1, rpcUrl: 'https://rpc.ankr.com/eth', mode: 'chainlink' },
  arbitrum: { name: 'Arbitrum One', chainId: 42161, rpcUrl: 'https://rpc.ankr.com/arbitrum', mode: 'chainlink' },
  'arbitrum-sepolia': { name: 'Arbitrum Sepolia', chainId: 421614, rpcUrl: 'https://rpc.ankr.com/arbitrum_sepolia', mode: 'chainlink' },
  polygon: { name: 'Polygon Mainnet', chainId: 137, rpcUrl: 'https://rpc.ankr.com/polygon', mode: 'chainlink' },
  base: { name: 'Base Mainnet', chainId: 8453, rpcUrl: 'https://rpc.ankr.com/base', mode: 'chainlink' },
  'base-sepolia': { name: 'Base Sepolia', chainId: 84532, rpcUrl: 'https://rpc.ankr.com/base_sepolia', mode: 'chainlink' },
  optimism: { name: 'Optimism Mainnet', chainId: 10, rpcUrl: 'https://rpc.ankr.com/optimism', mode: 'chainlink' },
  'optimism-sepolia': { name: 'Optimism Sepolia', chainId: 11155420, rpcUrl: 'https://rpc.ankr.com/optimism_sepolia', mode: 'chainlink' },
  avalanche: { name: 'Avalanche Mainnet', chainId: 43114, rpcUrl: 'https://rpc.ankr.com/avalanche', mode: 'chainlink' },
  'avalanche-fuji': { name: 'Avalanche Fuji', chainId: 43113, rpcUrl: 'https://rpc.ankr.com/avalanche_fuji', mode: 'chainlink' }
};

async function handleNetworkList(): Promise<void> {
  console.log(`🌐 Available Networks:\n`);

  console.log(`📍 Common Networks:`);
  for (const [key, network] of Object.entries(COMMON_NETWORKS)) {
    const modeEmoji = network.mode === 'local' ? '🏠' : '🔗';
    console.log(`   ${modeEmoji} ${key.padEnd(20)} ${network.name} (${network.chainId})`);
  }

  console.log(`\n🔗 Chainlink Automation Support:`);
  console.log(`   The following networks have full Chainlink Automation support:`);
  
  // Get supported chainIds from the automation networks config
  try {
    const supportedNetworks = [];
    const testChainIds = [1, 11155111, 42161, 421614, 137, 8453, 84532, 10, 11155420, 43114, 43113, 56, 97, 250, 4002, 100, 10200, 1101, 1442, 534352, 534351];
    
    for (const chainId of testChainIds) {
      try {
        const config = getAutomationNetworkConfig(chainId);
        supportedNetworks.push(`   ✅ ${config.name} (${chainId})`);
      } catch {
        // Network not supported
      }
    }
    
    if (supportedNetworks.length > 0) {
      supportedNetworks.forEach(network => console.log(network));
    } else {
      console.log(`   ⚠️  No supported networks found in configuration`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not load Chainlink network configurations: ${error}`);
  }

  console.log(`\n💡 Usage:`);
  console.log(`   Use network names with --network flag: --network sepolia`);
  console.log(`   Or specify custom RPC with: --rpc-url https://your-rpc-url`);
}

async function handleNetworkShow(args: NetworkShowArgs): Promise<void> {
  try {
    const { chainId } = args;
    
    console.log(`🔍 Network Information for Chain ID: ${chainId}\n`);

    // Find in common networks
    const commonNetwork = Object.entries(COMMON_NETWORKS).find(([_, network]) => network.chainId === chainId);
    if (commonNetwork) {
      const [key, network] = commonNetwork;
      console.log(`📍 Common Network:`);
      console.log(`   Name: ${network.name}`);
      console.log(`   Key: ${key}`);
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Default RPC: ${network.rpcUrl}`);
      console.log(`   Mode: ${network.mode}`);
      console.log();
    }

    // Check Chainlink Automation support
    try {
      const automationConfig = getAutomationNetworkConfig(chainId);
      console.log(`🔗 Chainlink Automation Support: ✅ Yes`);
      console.log(`   Network Name: ${automationConfig.name}`);
      console.log(`   Registry: ${automationConfig.registryAddress}`);
      console.log(`   Registrar: ${automationConfig.registrarAddress}`);
      console.log(`   LINK Token: ${automationConfig.linkTokenAddress}`);
      console.log(`   Gas Limits:`);
      console.log(`     Check: ${automationConfig.parameters.checkGasLimit.toLocaleString()}`);
      console.log(`     Perform: ${automationConfig.parameters.performGasLimit.toLocaleString()}`);
      console.log(`   Min Upkeep Spend: ${automationConfig.parameters.minUpkeepSpendLink} LINK`);
      if (automationConfig.parameters.maxCheckDataSize) {
        console.log(`   Max Check Data: ${automationConfig.parameters.maxCheckDataSize} bytes`);
      }
      if (automationConfig.parameters.maxPerformDataSize) {
        console.log(`   Max Perform Data: ${automationConfig.parameters.maxPerformDataSize} bytes`);
      }
    } catch (error) {
      console.log(`🔗 Chainlink Automation Support: ❌ No`);
      console.log(`   This network is not supported by Chainlink Automation in this library: ${error}`);
    }

  } catch (error) {
    console.error(`❌ Error showing network info: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleNetworkTest(args: NetworkTestArgs): Promise<void> {
  try {
    const { rpcUrl = 'http://127.0.0.1:8545', timeout = 10000 } = args;
    
    console.log(`🧪 Testing network connection...`);
    console.log(`📡 RPC URL: ${rpcUrl}`);
    console.log(`⏱️  Timeout: ${timeout}ms\n`);

    // Create provider with timeout
    const provider = new ethers.providers.JsonRpcProvider({
      url: rpcUrl,
      timeout
    });

    // Test basic connectivity
    console.log(`🔌 Testing basic connectivity...`);
    const startTime = Date.now();
    
    try {
      const network = await provider.getNetwork();
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Connection successful!`);
      console.log(`   Network Name: ${network.name || 'unknown'}`);
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Response Time: ${responseTime}ms`);
    } catch (error) {
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test block number
    console.log(`\n🧱 Testing block data...`);
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Latest block: ${blockNumber.toLocaleString()}`);
      
      // Get latest block details
      const block = await provider.getBlock(blockNumber);
      console.log(`   Block Hash: ${block.hash.slice(0, 10)}...`);
      console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
      console.log(`   Transactions: ${block.transactions.length}`);
    } catch (error) {
      console.warn(`⚠️  Could not fetch block data: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test gas price
    console.log(`\n⛽ Testing gas price...`);
    try {
      const gasPrice = await provider.getGasPrice();
      const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
      console.log(`✅ Current gas price: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei`);
    } catch (error) {
      console.warn(`⚠️  Could not fetch gas price: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check if it's a known network
    const knownNetwork = Object.entries(COMMON_NETWORKS).find(([_, network]) => network.rpcUrl === rpcUrl);
    if (knownNetwork) {
      const [key, network] = knownNetwork;
      console.log(`\n🏷️  Recognized Network: ${network.name} (${key})`);
    }

    console.log(`\n✅ Network test completed successfully!`);

  } catch (error) {
    console.error(`❌ Network test failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export function networkCommands(yargs: Argv): Argv {
  return yargs.command(
    'network <command>',
    'Network management commands',
    (yargs) => {
      return yargs
        .command(
          'list',
          'List supported networks',
          () => {},
          async () => {
            await handleNetworkList();
          }
        )
        .command(
          'show <chain-id>',
          'Show network configuration',
          (yargs) => {
            return yargs.positional('chain-id', {
              describe: 'Chain ID to show',
              type: 'number',
              demandOption: true
            });
          },
          async (args) => {
            await handleNetworkShow(args as NetworkShowArgs);
          }
        )
        .command(
          'test',
          'Test network connection',
          (yargs) => {
            return yargs
              .option('rpc-url', {
                alias: 'r',
                describe: 'RPC URL to test',
                type: 'string',
                default: 'http://127.0.0.1:8545'
              })
              .option('timeout', {
                alias: 't',
                describe: 'Connection timeout in milliseconds',
                type: 'number',
                default: 10000
              });
          },
          async (args) => {
            await handleNetworkTest(args as NetworkTestArgs);
          }
        )
        .demandCommand(1, 'Please specify a network command')
        .help();
    },
    () => {
      console.log('Please specify a network command. Use --help for available commands.');
    }
  );
} 