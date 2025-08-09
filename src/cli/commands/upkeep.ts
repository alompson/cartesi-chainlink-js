import type { Argv } from 'yargs';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { applyManifest } from '../apply-manifest.js';
import { Automation } from '../../automation.js';
import { CreateUpkeepOptions } from '../../interfaces.js';

interface UpkeepApplyArgs {
  file: string;
  rpcUrl: string;
  privateKey: string;
  network?: string;
  dryRun?: boolean;
}

interface UpkeepRegisterArgs {
  name: string;
  contract: string;
  trigger: 'log' | 'custom';
  gasLimit: number;
  initialFunds?: string;
  network?: string;
  rpcUrl: string;
  privateKey: string;
  // Log-specific options
  logEmitter?: string;
  logEvent?: string;
  logTopics?: string;
}

interface UpkeepListArgs {
  network?: string;
}

interface UpkeepShowArgs {
  upkeepId: string;
  network?: string;
  rpcUrl: string;
  privateKey: string;
}

interface UpkeepFundArgs {
  upkeepId: string;
  amount: string;
  network?: string;
  rpcUrl: string;
  privateKey: string;
}

// Network configurations for common networks
const NETWORK_CONFIGS: Record<string, { chainId: number; rpcUrl: string; mode: 'local' | 'chainlink' }> = {
  local: { chainId: 31337, rpcUrl: 'http://127.0.0.1:8545', mode: 'local' },
  sepolia: { chainId: 11155111, rpcUrl: 'https://rpc.ankr.com/eth_sepolia', mode: 'chainlink' },
  mainnet: { chainId: 1, rpcUrl: 'https://rpc.ankr.com/eth', mode: 'chainlink' },
  arbitrum: { chainId: 42161, rpcUrl: 'https://rpc.ankr.com/arbitrum', mode: 'chainlink' },
  polygon: { chainId: 137, rpcUrl: 'https://rpc.ankr.com/polygon', mode: 'chainlink' },
  base: { chainId: 8453, rpcUrl: 'https://rpc.ankr.com/base', mode: 'chainlink' }
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
    rpcUrl: rpcUrl || 'http://127.0.0.1:8545',
    mode: 'local' as const
  };
}

async function handleUpkeepApply(args: UpkeepApplyArgs): Promise<void> {
  try {
    const { file, privateKey, dryRun, network } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    // Validate private key format
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error('Invalid private key format. Expected 64 hex characters with 0x prefix.');
    }

    // Create provider and wallet
    console.log(`🔗 Connecting to RPC: ${networkConfig.rpcUrl}`);
    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    
    // Test connection
    try {
      const network = await provider.getNetwork();
      console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      throw new Error(`Failed to connect to RPC endpoint: ${error instanceof Error ? error.message : String(error)}`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`👤 Using wallet: ${wallet.address}`);

    // Check wallet balance
    try {
      const balance = await wallet.getBalance();
      const balanceEth = ethers.utils.formatEther(balance);
      console.log(`💰 Wallet balance: ${balanceEth} ETH`);
      
      if (balance.isZero()) {
        console.warn(`⚠️  Warning: Wallet has no ETH for gas fees`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not fetch wallet balance: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (dryRun) {
      console.log(`🧪 Dry run mode enabled - no transactions will be sent`);
      console.log(`ℹ️  Dry-run validation not yet implemented`);
      return;
    }

    // Apply the manifest
    await applyManifest(file, wallet);

  } catch (error) {
    console.error(`❌ Error applying manifest: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUpkeepRegister(args: UpkeepRegisterArgs): Promise<void> {
  try {
    const { name, contract, trigger, gasLimit, network, privateKey } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const automation = new Automation({
      signer: wallet,
      chainId: networkConfig.chainId,
      mode: networkConfig.mode
    });

    let upkeepOptions: CreateUpkeepOptions;
    
    if (trigger === 'log') {
      if (!args.logEmitter || !args.logEvent) {
        throw new Error('Log emitter address and event signature are required for log triggers');
      }
      upkeepOptions = {
        name,
        upkeepContract: contract,
        gasLimit,
        triggerType: 'log',
        initialFunds: args.initialFunds || (networkConfig.mode === 'chainlink' ? '1.0' : '0'),
        logEmitterAddress: args.logEmitter,
        logEventSignature: args.logEvent,
        ...(args.logTopics && {
          logTopicFilters: args.logTopics.split(',').map(t => t.trim() || null)
        })
      };
    } else {
      upkeepOptions = {
        name,
        upkeepContract: contract,
        gasLimit,
        triggerType: 'custom',
        initialFunds: args.initialFunds || (networkConfig.mode === 'chainlink' ? '1.0' : '0')
      };
    }

    console.log(`📝 Registering ${trigger} upkeep: ${name}`);
    const { upkeepId } = await automation.createUpkeep(upkeepOptions);
    
    console.log(`🎉 Upkeep registered successfully!`);
    console.log(`📊 Upkeep ID: ${upkeepId}`);
    console.log(`📍 Contract: ${contract}`);

  } catch (error) {
    console.error(`❌ Error registering upkeep: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUpkeepList(args: UpkeepListArgs): Promise<void> {
  try {
    console.log(`📋 Listing upkeeps...`);
    
    // Look for .state.json files in current directory and subdirectories
    const stateFiles = findStateFiles(process.cwd());
    
    if (stateFiles.length === 0) {
      console.log(`ℹ️  No upkeep state files found in current directory`);
      console.log(`💡 State files are created when using 'upkeep apply' command`);
      return;
    }

    console.log(`\n📊 Found ${stateFiles.length} upkeep(s):\n`);
    
    for (const file of stateFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const state = JSON.parse(content);
        
        console.log(`🔹 ${state.name}`);
        console.log(`   ID: ${state.upkeepId}`);
        console.log(`   Contract: ${state.address}`);
        console.log(`   Network: ${state.network.mode} (${state.network.chainId})`);
        console.log(`   Created: ${new Date(state.timestamp).toLocaleString()}`);
        console.log(`   State file: ${path.relative(process.cwd(), file)}\n`);
      } catch (error) {
        console.warn(`⚠️  Could not read state file: ${file} - ${error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error listing upkeeps: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUpkeepShow(args: UpkeepShowArgs): Promise<void> {
  try {
    const { upkeepId, network, privateKey } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const automation = new Automation({
      signer: wallet,
      chainId: networkConfig.chainId,
      mode: networkConfig.mode
    });

    console.log(`🔍 Fetching upkeep details for ID: ${upkeepId}`);
    
    const upkeepInfo = await automation.getUpkeep(upkeepId);
    
    console.log(`\n📊 Upkeep Details:`);
    console.log(`   ID: ${upkeepId}`);
    console.log(`   Target: ${upkeepInfo.target}`);
    console.log(`   Admin: ${upkeepInfo.admin}`);
    console.log(`   Balance: ${upkeepInfo.balance} LINK`);
    console.log(`   Gas Limit: ${upkeepInfo.gasLimit}`);
    console.log(`   Paused: ${upkeepInfo.isPaused ? 'Yes' : 'No'}`);
    if (upkeepInfo.performData && upkeepInfo.performData !== '0x') {
      console.log(`   Perform Data: ${upkeepInfo.performData}`);
    }

  } catch (error) {
    console.error(`❌ Error showing upkeep: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUpkeepFund(args: UpkeepFundArgs): Promise<void> {
  try {
    const { upkeepId, amount, network, privateKey } = args;
    const networkConfig = getNetworkConfig(network, args.rpcUrl);

    if (networkConfig.mode === 'local') {
      console.log(`ℹ️  Funding is not required for local mode`);
      return;
    }

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const automation = new Automation({
      signer: wallet,
      chainId: networkConfig.chainId,
      mode: networkConfig.mode
    });

    console.log(`💰 Funding upkeep ${upkeepId} with ${amount} LINK...`);
    
    await automation.addFunds(upkeepId, amount);
    
    console.log(`✅ Upkeep funded successfully!`);

  } catch (error) {
    console.error(`❌ Error funding upkeep: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function findStateFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findStateFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.state.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore directories we can't read
  }
  
  return files;
}

export function upkeepCommands(yargs: Argv): Argv {
  return yargs.command(
    'upkeep <command>',
    'Upkeep management commands',
    (yargs) => {
      return yargs
        .command(
          'apply <file>',
          'Apply a manifest file to deploy and register upkeeps',
          (yargs) => {
            return yargs
              .positional('file', {
                describe: 'Path to the manifest JSON file',
                type: 'string',
                demandOption: true
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
              })
              .option('dry-run', {
                alias: 'd',
                describe: 'Validate the manifest without executing transactions',
                type: 'boolean',
                default: false
              });
          },
          async (args) => {
            await handleUpkeepApply(args as UpkeepApplyArgs);
          }
        )
        .command(
          'register',
          'Register an upkeep directly (programmatic style)',
          (yargs) => {
            return yargs
              .option('name', {
                describe: 'Name for the upkeep',
                type: 'string',
                demandOption: true
              })
              .option('contract', {
                describe: 'Address of the upkeep contract',
                type: 'string',
                demandOption: true
              })
              .option('trigger', {
                describe: 'Trigger type',
                choices: ['log', 'custom'] as const,
                demandOption: true
              })
              .option('gas-limit', {
                describe: 'Gas limit for upkeep execution',
                type: 'number',
                default: 500000
              })
              .option('initial-funds', {
                describe: 'Initial LINK funding amount',
                type: 'string'
              })
              .option('log-emitter', {
                describe: 'Log emitter contract address (for log triggers)',
                type: 'string'
              })
              .option('log-event', {
                describe: 'Log event signature (for log triggers)',
                type: 'string'
              })
              .option('log-topics', {
                describe: 'Log topic filters (comma-separated, for log triggers)',
                type: 'string'
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
            await handleUpkeepRegister(args as UpkeepRegisterArgs);
          }
        )
        .command(
          'list',
          'List upkeeps from state files',
          (yargs) => {
            return yargs.option('network', {
              alias: 'n',
              describe: 'Filter by network',
              type: 'string'
            });
          },
          async (args) => {
            await handleUpkeepList(args as UpkeepListArgs);
          }
        )
        .command(
          'show <upkeep-id>',
          'Show upkeep details',
          (yargs) => {
            return yargs
              .positional('upkeep-id', {
                describe: 'Upkeep ID to show',
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
            await handleUpkeepShow(args as UpkeepShowArgs);
          }
        )
        .command(
          'fund <upkeep-id>',
          'Fund an upkeep with LINK tokens',
          (yargs) => {
            return yargs
              .positional('upkeep-id', {
                describe: 'Upkeep ID to fund',
                type: 'string',
                demandOption: true
              })
              .option('amount', {
                describe: 'Amount of LINK to add',
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
            await handleUpkeepFund(args as UpkeepFundArgs);
          }
        )
        .demandCommand(1, 'Please specify an upkeep command')
        .help();
    },
    () => {
      console.log('Please specify an upkeep command. Use --help for available commands.');
    }
  );
} 