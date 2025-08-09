#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import { startSimulatorServer } from './server.js';
import { ANVIL_ACCOUNTS } from './accounts.js';

interface CliArgs {
    rpcUrl?: string;
    privateKey?: string;
}

// Helper function to create a formatted choice for the prompts list
const formatAnvilAccount = (account: { address: string; privateKey: string }, index: number) => {
    const address = account.address;
    const key = account.privateKey.slice(0, 10); // Show first 8 chars of the key
    return {
        title: `Account #${index}: ${address} (key: ${key}...)`,
        value: account.privateKey,
    };
};

async function main() {
    // 1. Configure yargs to parse command-line arguments
    const argv = await yargs(hideBin(process.argv))
        .option('rpc-url', {
            type: 'string',
            description: 'The JSON-RPC URL of the local blockchain node (e.g., Anvil, Hardhat).',
        })
        .option('private-key', {
            type: 'string',
            description: 'The private key of the wallet to use for sending transactions.',
        })
        .help()
        .alias('h', 'help')
        .argv as CliArgs;

    let { rpcUrl, privateKey } = argv;

    // 2. Interactively prompt for any missing arguments
    const questions: prompts.PromptObject[] = [];

    // Prompt for RPC URL if not provided
    if (!rpcUrl) {
        questions.push({
            type: 'text',
            name: 'rpcUrl',
            message: 'Enter the JSON-RPC URL of your local blockchain node:',
            initial: 'http://127.0.0.1:8545',
        });
    }

    // Prompt for Private Key if not provided, with framework selection
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

    const responses = await prompts(questions, {
        onCancel: () => {
            console.log('Operation cancelled.');
            process.exit(0);
        }
    });

    rpcUrl = rpcUrl || responses.rpcUrl;
    privateKey = privateKey || responses.privateKey;
    
    // 3. Validate that we have the necessary configuration
    if (!rpcUrl || !privateKey) {
        console.error('RPC URL and Private Key are required to start the simulator.');
        process.exit(1);
    }

    console.log('Starting Local Chainlink Simulator...');
    
    // 4. Start the server with the collected configuration
    startSimulatorServer({ rpcUrl, privateKey });
}

main().catch((error) => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
});
