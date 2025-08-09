import type { Argv } from 'yargs';
import { ethers } from 'ethers';
import prompts from 'prompts';
import { startSimulatorServer } from '../../simulator/server.js';
import { ANVIL_ACCOUNTS } from '../../simulator/accounts.js';

interface DevStartArgs {
  port?: number;
  rpcUrl?: string;
  privateKey?: string;
  interactive?: boolean;
}

interface DevStatusArgs {
  port?: number;
}

// Helper function to format Anvil account selection
const formatAnvilAccount = (account: { address: string; privateKey: string }, index: number) => {
  const address = account.address;
  const key = account.privateKey.slice(0, 10);
  return {
    title: `Account #${index}: ${address} (key: ${key}...)`,
    value: account.privateKey,
  };
};

async function handleDevStart(args: DevStartArgs): Promise<void> {
  try {
    let { rpcUrl, privateKey } = args;
    const { interactive = true } = args;

    // Interactive prompts if values not provided
    if (interactive && (!rpcUrl || !privateKey)) {
      const questions: prompts.PromptObject[] = [];

      if (!rpcUrl) {
        questions.push({
          type: 'text',
          name: 'rpcUrl',
          message: 'Enter the JSON-RPC URL of your local blockchain node:',
          initial: 'http://127.0.0.1:8545',
        });
      }

      if (!privateKey) {
        questions.push({
          type: 'select',
          name: 'framework',
          message: 'Which local blockchain are you using?',
          choices: [
            { title: 'Anvil (Foundry)', value: 'anvil' },
            { title: 'Hardhat', value: 'hardhat' },
            { title: 'Other (e.g., Ganache)', value: 'other' },
          ],
          initial: 0,
        });
        questions.push({
          type: (prev) => (prev === 'anvil' || prev === 'hardhat' ? 'select' : 'password'),
          name: 'privateKey',
          message: (prev) => {
            if (prev === 'anvil') return 'Select a default Anvil account to use:';
            if (prev === 'hardhat') return 'Select a default Hardhat account to use:';
            return 'Enter the private key for the simulator wallet:';
          },
          choices: (prev) => 
            (prev === 'anvil' || prev === 'hardhat')
            ? ANVIL_ACCOUNTS.map(formatAnvilAccount)
            : [],
        });
      }

      if (questions.length > 0) {
        const responses = await prompts(questions, {
          onCancel: () => {
            console.log('Operation cancelled.');
            process.exit(0);
          }
        });

        rpcUrl = rpcUrl || responses.rpcUrl;
        privateKey = privateKey || responses.privateKey;
      }
    }

    // Validate required parameters
    if (!rpcUrl || !privateKey) {
      throw new Error('RPC URL and Private Key are required to start the simulator.');
    }

    console.log('🚀 Starting Local Chainlink Simulator...');
    console.log(`📡 RPC URL: ${rpcUrl}`);
    
    // Test connection before starting
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      throw new Error(`Failed to connect to RPC: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Start the simulator server
    startSimulatorServer({ rpcUrl, privateKey });

  } catch (error) {
    console.error(`❌ Error starting simulator: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleDevStatus(args: DevStatusArgs): Promise<void> {
  const { port = 7788 } = args;
  
  try {
    console.log(`🔍 Checking simulator status on port ${port}...`);
    
    // Try to connect to the simulator
    const response = await fetch(`http://localhost:${port}/status`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Simulator is running`);
      console.log(`📊 Status: ${data.status || 'active'}`);
      console.log(`🌐 URL: http://localhost:${port}`);
    } else {
      console.log(`❌ Simulator is not responding (HTTP ${response.status})`);
    }
  } catch (_error) {
    console.log(`❌ Simulator is not running on port ${port}`);
    console.log(`💡 Start it with: cartesi-chainlink dev start`);
  }
}

async function handleDevStop(): Promise<void> {
  console.log(`⚠️  Manual stop not implemented yet.`);
  console.log(`💡 Use Ctrl+C to stop the simulator process.`);
}

export function devCommands(yargs: Argv): Argv {
  return yargs.command(
    'dev <command>',
    'Local development commands',
    (yargs) => {
      return yargs
        .command(
          'start',
          'Start the local Chainlink simulator',
          (yargs) => {
            return yargs
              .option('port', {
                alias: 'p',
                type: 'number',
                description: 'Port for the simulator server',
                default: 7788
              })
              .option('rpc-url', {
                alias: 'r',
                type: 'string',
                description: 'RPC URL of the local blockchain node'
              })
              .option('private-key', {
                alias: 'k',
                type: 'string',
                description: 'Private key for simulator wallet'
              })
              .option('no-interactive', {
                type: 'boolean',
                description: 'Disable interactive prompts',
                default: false
              });
          },
          async (args) => {
            await handleDevStart({
              ...args,
              interactive: !args.noInteractive
            } as DevStartArgs);
          }
        )
        .command(
          'status',
          'Check the status of the local simulator',
          (yargs) => {
            return yargs.option('port', {
              alias: 'p',
              type: 'number',
              description: 'Port of the simulator server',
              default: 7788
            });
          },
          async (args) => {
            await handleDevStatus(args as DevStatusArgs);
          }
        )
        .command(
          'stop',
          'Stop the local simulator',
          () => {},
          async () => {
            await handleDevStop();
          }
        )
        .demandCommand(1, 'Please specify a dev command')
        .help();
    },
    () => {
      // Handler for just 'dev' without subcommand
      console.log('Please specify a dev command. Use --help for available commands.');
    }
  );
} 