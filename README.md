# Chainlink Automation Library

A TypeScript library for registering and managing Chainlink Automation upkeeps, with a built-in simulator for local development and testing.

This library simplifies all interactions with the Chainlink Automation ecosystem, providing a unified, strongly-typed API for both on-chain and local environments.

While the library is generic, it includes specific, production-ready smart contract examples for integrating Chainlink Automation with **Cartesi dApps**.

## Understanding Chainlink Automation

Chainlink Automation is a decentralized service that allows you to run your smart contract's functions based on triggers you define. An **Upkeep** is the name for the automated job you register with the network. A decentralized network of nodes (Keepers) earns rewards by reliably monitoring your upkeep's conditions and submitting transactions to execute it when those conditions are met.

This library supports the two primary trigger types:
-   **Custom Logic (`custom`):** The network checks your contract on every new block. Your `checkUpkeep` function contains custom logic (e.g., checking if a certain amount of time has passed) to tell the network when to run the upkeep.
-   **Log Trigger (`log`):** The network listens for a specific event (a log) to be emitted from a contract you specify. When the event is detected, it triggers your upkeep.

For more in-depth information, please refer to the [official Chainlink Automation documentation](https://docs.chain.link/chainlink-automation).

---

## Local Testing with the Simulator

For rapid development and integration testing, this library includes a powerful **Local Simulator**. This tool mimics the behavior of the entire Chainlink Automation network on your local machine, allowing you to test your contracts end-to-end without needing a live testnet, faucets, or real LINK tokens.

### How It Works

The local testing environment uses a client-server model:
1.  **The Simulator Service (The "Engine"):** A background service you run from your terminal. It connects to your local blockchain (like Anvil or Hardhat), listens for blockchain events, and acts as a local "Keeper" to execute your upkeeps.
2.  **The Library Client (The "Remote Control"):** When you initialize the library in `'local'` mode, your test script communicates with the running simulator service via a simple API, telling it which contracts to watch.

### Getting Started with Local Testing

Follow these steps to test your automation logic locally.

#### 1. Run a Local Blockchain
In your first terminal, start your preferred local node.
```bash
# For Foundry users
anvil

# For Hardhat users
npx hardhat node
```

#### 2. Run the Simulator Service
In a second terminal, start the simulator service. It will prompt you for the RPC URL and a private key if you don't provide them as arguments.
```bash
# This will start the service with interactive prompts
npx run-local-simulator

# Or, provide arguments directly
npx run-local-simulator --rpc-url http://127.0.0.1:8545 --private-key 0xac09...
```
The service will now be running in the background, waiting for instructions.

#### 3. Write Your Test Script
In your test script (e.g., using Jest), import and use the library in `'local'` mode.

```typescript
import { Automation } from 'cartesi-chainlink-lib';
import { ethers } from 'ethers';

// This test assumes you have already deployed your upkeep contract to the local node.
const upkeepContractAddress = '0xYOUR_DEPLOYED_UPKEEP_CONTRACT_ADDRESS';

// Connect a signer to your local node
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = new ethers.Wallet('0xac09...', provider);

// 1. Initialize the library in 'local' mode
const automation = new Automation({
    signer,
    chainId: 31337, // Default local chain ID
    mode: 'local' 
});

async function registerLocalUpkeep() {
    // 2. Register the upkeep with the running simulator service
    const { upkeepId } = await automation.createUpkeep({
        name: 'My Local Test Upkeep',
        upkeepContract: upkeepContractAddress,
        triggerType: 'custom', // or 'log'
        gasLimit: 500_000,
        // Note: `initialFunds` is not required for local mode
    });
    console.log(`Upkeep registered locally with ID: ${upkeepId}`); // ID is the contract address

    // 3. Your test logic can now proceed...
    // The simulator will automatically call performUpkeep when conditions are met.
}

registerLocalUpkeep();
```

---

## On-Chain Usage (Testnet/Mainnet)

This section describes how to use the library to interact with the live Chainlink Automation network.

### Prerequisites

Before using this library against a live network, you will need:

1.  **A Deployed Contract:** An Automation-compatible smart contract deployed on your target network. You can use the contracts in the `/examples` directory as a starting point.
2.  **The Contract Address:** The address of your deployed compatible contract.
3.  **A Funded Wallet:** A wallet with a private key or mnemonic that holds:
    -   Sufficient native currency (e.g., ETH) for transaction gas fees.
    -   Sufficient LINK tokens to fund your upkeep. All upkeeps are paid for in LINK.
4.  **An RPC URL:** The URL of a node for your target network (e.g., from Infura, Alchemy, or a public node).

### Core Features

-   **Programmatic Upkeep Management:** Create, pause, unpause, cancel, and fund upkeeps directly from your code.
-   **Strongly-Typed:** A full suite of TypeScript interfaces for all contract options and return values.
-   **Built-in Local Simulator:** Test your entire automation flow without leaving your local environment.
-   **Cartesi-Ready Examples:** Smart contract examples for the most common Cartesi automation patterns.
-   **Log & Custom Logic Support:** Full support for both `custom` logic (including time-based) and `log`-triggered upkeeps.

### Example: Registering an On-Chain Upkeep

This example registers the `LogTriggeredInputTracker` to listen for `InputAdded` events from the Cartesi `InputBox` on a live network like Sepolia.

```typescript
import { Automation } from 'cartesi-chainlink-lib';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const chainId = 11155111; // Sepolia

// Initialize in the default 'chainlink' mode
const automation = new Automation({ signer, chainId });

// The official Cartesi InputBox address for your network
const inputBoxAddress = '0xINPUT_BOX_ADDRESS'; 
// The address of your deployed upkeep contract
const upkeepContractAddress = '0xUPKEEP_CONTRACT_ADDRESS';

const options = {
    name: 'Cartesi Input Tracker',
    upkeepContract: upkeepContractAddress,
    gasLimit: 500_000,
    initialFunds: '10.0', // 10 LINK
    triggerType: 'log',
    // Log-specific options
    logEmitterAddress: inputBoxAddress,
    logEventSignature: 'InputAdded(address,uint256,bytes)',
};

async function register() {
    const { upkeepId } = await automation.createUpkeep(options);
    console.log(`Upkeep registered with ID: ${upkeepId}`);
}

register();
```
