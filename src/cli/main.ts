#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

// Import command handlers
import { devCommands } from './commands/dev.js';
import { upkeepCommands } from './commands/upkeep.js';
import { contractCommands } from './commands/contract.js';
import { networkCommands } from './commands/network.js';
import { utilCommands } from './commands/util.js';

async function main(): Promise<void> {
  const cli = yargs(hideBin(process.argv))
    .scriptName('cartesi-chainlink')
    .usage('$0 <command> [options]')
    .version('1.0.0')
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'Please specify a command')
    .strict()
    .recommendCommands()
    .wrap(Math.min(120, process.stdout.columns || 80));

  // Register command groups
  devCommands(cli);
  upkeepCommands(cli);
  contractCommands(cli);
  networkCommands(cli);
  utilCommands(cli);

  // Global options
  cli.option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging',
    global: true
  });

  cli.option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to configuration file',
    global: true
  });

  // Examples
  cli.example([
    ['$0 dev start', 'Start the local simulator'],
    ['$0 upkeep apply manifest.json', 'Deploy and register upkeep from manifest'],
    ['$0 network list', 'Show supported networks'],
    ['$0 util init --type log', 'Generate a log trigger manifest template']
  ]);

  // Parse and execute
  await cli.argv;
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