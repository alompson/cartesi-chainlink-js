#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { ethers } from 'ethers';
import { applyManifest } from './apply-manifest.js';

interface ApplyCommandArgs {
  file: string;
  rpcUrl: string;
  privateKey: string;
  dryRun?: boolean;
}

async function handleApplyCommand(args: ApplyCommandArgs): Promise<void> {
  const { file, rpcUrl, privateKey, dryRun } = args;

  try {
    // Validate private key format
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error('Invalid private key format. Expected 64 hex characters with 0x prefix.');
    }

    // Create provider and wallet
    console.log(`🔗 Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Test connection
    try {
      const network = await provider.getNetwork();
      console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      throw new Error(`Failed to connect to RPC endpoint: ${error instanceof Error ? error.message : String(error)}`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`👤 Using wallet: ${wallet.address}`);

    // Check wallet balance for informational purposes
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
      // TODO: Implement dry-run validation
      console.log(`ℹ️  Dry-run validation not yet implemented`);
      return;
    }

    // Apply the manifest
    await applyManifest(file, wallet);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('chainlink-upkeeps')
    .usage('$0 <command> [options]')
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
          .option('rpc-url', {
            alias: 'r',
            describe: 'RPC URL of the blockchain node',
            type: 'string',
            default: 'http://127.0.0.1:8545'
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
        await handleApplyCommand(args as ApplyCommandArgs);
      }
    )
    .example([
      ['$0 apply manifest.json --private-key 0x123...', 'Apply manifest using default local RPC'],
      ['$0 apply manifest.json --rpc-url https://rpc.ankr.com/eth_sepolia --private-key 0x123...', 'Apply manifest to Sepolia testnet'],
      ['$0 apply manifest.json --private-key 0x123... --dry-run', 'Validate manifest without executing']
    ])
    .demandCommand(1, 'Please specify a command')
    .help('h')
    .alias('h', 'help')
    .version('1.0.0')
    .strict()
    .argv;
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  console.error('❌ CLI Error:', error);
  process.exit(1);
}); 