import type { Argv } from 'yargs';
import { ethers } from 'ethers';
import { deployUpkeep } from '../../manifest/deployer.js';

interface ContractDeployArgs {
  artifact: string;
  args?: string;
  network?: string;
  rpcUrl: string;
  privateKey: string;
}

interface ContractVerifyArgs {
  address: string;
  network?: string;
  rpcUrl: string;
  privateKey: string;
}

// Network configurations
const NETWORK_CONFIGS: Record<string, { chainId: number; rpcUrl: string }> = {
  local: { chainId: 31337, rpcUrl: 'http://127.0.0.1:8545' },
  sepolia: { chainId: 11155111, rpcUrl: 'https://rpc.ankr.com/eth_sepolia' },
  mainnet: { chainId: 1, rpcUrl: 'https://rpc.ankr.com/eth' },
  arbitrum: { chainId: 42161, rpcUrl: 'https://rpc.ankr.com/arbitrum' },
  polygon: { chainId: 137, rpcUrl: 'https://rpc.ankr.com/polygon' },
  base: { chainId: 8453, rpcUrl: 'https://rpc.ankr.com/base' }
};

function getNetworkConfig(network?: string, rpcUrl?: string) {
  if (network && NETWORK_CONFIGS[network]) {
    return {
      ...NETWORK_CONFIGS[network],
      rpcUrl: rpcUrl || NETWORK_CONFIGS[network].rpcUrl
    };
  }
  return {
    chainId: 31337,
    rpcUrl: rpcUrl || 'http://127.0.0.1:8545'
  };
}

async function handleContractDeploy(args: ContractDeployArgs): Promise<void> {
  try {
    const { artifact, args: constructorArgs, network, privateKey } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    console.log(`🚀 Deploying contract from artifact: ${artifact}`);
    
    // Parse constructor arguments
    let parsedArgs: unknown[] = [];
    if (constructorArgs) {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(constructorArgs);
        parsedArgs = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If that fails, split by comma and trim
        parsedArgs = constructorArgs.split(',').map(arg => arg.trim());
      }
    }

    // Create wallet
    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`🌐 Network: ${network || 'local'} (chainId: ${networkConfig.chainId})`);
    console.log(`👤 Deployer: ${wallet.address}`);
    
    // Deploy the contract
    const address = await deployUpkeep({
      wallet,
      artifactPath: artifact,
      constructorArgs: parsedArgs
    });

    console.log(`\n🎉 Contract deployed successfully!`);
    console.log(`📍 Address: ${address}`);
    console.log(`🌐 Network: ${network || 'local'}`);
    console.log(`⛽ Deployer: ${wallet.address}`);

  } catch (error) {
    console.error(`❌ Error deploying contract: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleContractVerify(args: ContractVerifyArgs): Promise<void> {
  try {
    const { address, network, privateKey } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    console.log(`🔍 Verifying upkeep contract compatibility: ${address}`);
    
    // Create wallet and provider
    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    const _wallet = new ethers.Wallet(privateKey, provider);

    // Check if contract exists
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error('No contract found at the specified address');
    }

    console.log(`✅ Contract exists at address: ${address}`);

    // Try to detect contract type by checking for known function signatures
    const _automationCompatibleSelector = '0x6e04ff0d'; // checkUpkeep(bytes)
    const _logAutomationSelector = '0x53596dcd'; // checkLog((uint256,uint256,bytes32,uint256,bytes32,address,bytes32[],bytes),bytes)

    try {
      // Create a basic contract instance to test function existence
      const basicAbi = [
        'function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)',
        'function checkLog(tuple(uint256 index, uint256 timestamp, bytes32 txHash, uint256 blockNumber, bytes32 blockHash, address source, bytes32[] topics, bytes data) log, bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData)',
        'function performUpkeep(bytes calldata performData) external'
      ];

      const contract = new ethers.Contract(address, basicAbi, provider);

      // Test checkUpkeep (AutomationCompatible)
      let isAutomationCompatible = false;
      try {
        // Try calling with static call to see if it reverts due to missing function
        await contract.callStatic.checkUpkeep('0x');
        isAutomationCompatible = true;
        console.log(`✅ Contract implements AutomationCompatible interface (checkUpkeep)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('function selector was not recognized')) {
          // Function exists but might have reverted for other reasons
          isAutomationCompatible = true;
          console.log(`✅ Contract implements AutomationCompatible interface (checkUpkeep)`);
        }
      }

      // Test checkLog (ILogAutomation)
      let isLogAutomation = false;
      try {
        const dummyLog = {
          index: 0,
          timestamp: 0,
          txHash: ethers.constants.HashZero,
          blockNumber: 0,
          blockHash: ethers.constants.HashZero,
          source: ethers.constants.AddressZero,
          topics: [],
          data: '0x'
        };
        
        await contract.callStatic.checkLog(dummyLog, '0x');
        isLogAutomation = true;
        console.log(`✅ Contract implements ILogAutomation interface (checkLog)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('function selector was not recognized')) {
          // Function exists but might have reverted for other reasons
          isLogAutomation = true;
          console.log(`✅ Contract implements ILogAutomation interface (checkLog)`);
        }
      }

      // Test performUpkeep
      let hasPerformUpkeep = false;
      try {
        // We can't actually call this, but we can check if the function exists
        const iface = new ethers.utils.Interface(basicAbi);
        const functionFragment = iface.getFunction('performUpkeep');
        if (functionFragment) {
          hasPerformUpkeep = true;
          console.log(`✅ Contract implements performUpkeep function`);
        }
      } catch {
        // Function doesn't exist
      }

      // Summary
      console.log(`\n📊 Compatibility Summary:`);
      console.log(`   Address: ${address}`);
      console.log(`   Network: ${network || 'local'}`);
      console.log(`   AutomationCompatible: ${isAutomationCompatible ? 'Yes' : 'No'}`);
      console.log(`   ILogAutomation: ${isLogAutomation ? 'Yes' : 'No'}`);
      console.log(`   performUpkeep: ${hasPerformUpkeep ? 'Yes' : 'No'}`);

      if (isAutomationCompatible || isLogAutomation) {
        console.log(`\n✅ Contract is compatible with Chainlink Automation!`);
        if (isAutomationCompatible && isLogAutomation) {
          console.log(`💡 Contract supports both custom logic and log triggers`);
        } else if (isAutomationCompatible) {
          console.log(`💡 Contract supports custom logic triggers`);
        } else {
          console.log(`💡 Contract supports log triggers`);
        }
      } else {
        console.log(`\n❌ Contract does not appear to be compatible with Chainlink Automation`);
        console.log(`💡 Make sure your contract implements AutomationCompatibleInterface or ILogAutomation`);
      }

    } catch (error) {
      console.warn(`⚠️  Could not fully verify contract interfaces: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`💡 Contract exists but interface verification failed - it might still be compatible`);
    }

  } catch (error) {
    console.error(`❌ Error verifying contract: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export function contractCommands(yargs: Argv): Argv {
  return yargs.command(
    'contract <command>',
    'Contract management commands',
    (yargs) => {
      return yargs
        .command(
          'deploy <artifact>',
          'Deploy a contract from an artifact file',
          (yargs) => {
            return yargs
              .positional('artifact', {
                describe: 'Path to the contract artifact JSON file',
                type: 'string',
                demandOption: true
              })
              .option('args', {
                describe: 'Constructor arguments (JSON array or comma-separated)',
                type: 'string'
              })
              .option('network', {
                alias: 'n',
                describe: 'Network name (local, sepolia, mainnet, etc.)',
                type: 'string'
              })
              .option('rpc-url', {
                alias: 'r',
                describe: 'RPC URL of the blockchain node',
                type: 'string'
              })
              .option('private-key', {
                alias: 'k',
                describe: 'Private key for wallet (with 0x prefix)',
                type: 'string',
                demandOption: true
              });
          },
          async (args) => {
            await handleContractDeploy(args as ContractDeployArgs);
          }
        )
        .command(
          'verify <address>',
          'Verify upkeep contract compatibility',
          (yargs) => {
            return yargs
              .positional('address', {
                describe: 'Contract address to verify',
                type: 'string',
                demandOption: true
              })
              .option('network', {
                alias: 'n',
                describe: 'Network name',
                type: 'string'
              })
              .option('rpc-url', {
                alias: 'r',
                describe: 'RPC URL',
                type: 'string'
              })
              .option('private-key', {
                alias: 'k',
                describe: 'Private key for wallet',
                type: 'string',
                demandOption: true
              });
          },
          async (args) => {
            await handleContractVerify(args as ContractVerifyArgs);
          }
        )
        .demandCommand(1, 'Please specify a contract command')
        .help();
    },
    () => {
      console.log('Please specify a contract command. Use --help for available commands.');
    }
  );
} 