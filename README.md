# Chainlink Automation Library

A TypeScript library for registering and managing Chainlink Automation upkeeps.

This library simplifies all interactions with the Chainlink Automation registry, providing strongly-typed methods for creating, managing, and monitoring your upkeeps.

While the library is generic, it includes specific, production-ready smart contract examples for integrating Chainlink Automation with **Cartesi dApps**.

## Understanding Chainlink Automation

Chainlink Automation is a decentralized service that allows you to run your smart contract's functions based on triggers you define. An **Upkeep** is the name for the automated job you register with the network. A decentralized network of nodes (Keepers) earns rewards by reliably monitoring your upkeep's conditions and submitting transactions to execute it when those conditions are met.

This library supports the two primary trigger types:
-   **Custom Logic (`custom`):** The network checks your contract on every new block. Your `checkUpkeep` function contains custom logic (e.g., checking if a certain amount of time has passed) to tell the network when to run the upkeep.
-   **Log Trigger (`log`):** The network listens for a specific event (a log) to be emitted from a contract you specify. When the event is detected, it triggers your upkeep.

## Prerequisites

Before using this library, you will need:

1.  **A Deployed Contract:** An Automation-compatible smart contract deployed on your target network. You can use the contracts in the `/examples` directory as a starting point.
2.  **The Contract Address:** The address of your deployed compatible contract.
3.  **A Funded Wallet:** A wallet with a private key or mnemonic that holds:
    -   Sufficient native currency (e.g., ETH) for transaction gas fees.
    -   Sufficient LINK tokens to fund your upkeep. All upkeeps are paid for in LINK.
4.  **An RPC URL:** The URL of a node for your target network (e.g., from Infura, Alchemy, or a public node).

## Core Features

-   **Programmatic Upkeep Management:** Create, pause, unpause, cancel, and fund upkeeps directly from your code.
-   **Strongly-Typed:** A full suite of TypeScript interfaces for all contract options and return values.
-   **Cartesi-Ready Examples:** Production-grade smart contract examples for the most common Cartesi automation patterns.
-   **Log & Custom Logic Support:** Full support for both `custom` logic (including time-based) and `log`-triggered upkeeps.

---

## How to Use with Cartesi

This library is ideal for automating tasks related to a Cartesi dApp. We provide two main blueprint contracts in the `/examples` directory.

### Pattern 1: Triggering a Cartesi dApp on a Schedule

-   **Goal:** Periodically send an input to your Cartesi dApp to trigger a scheduled task.
-   **Example:** Use `examples/CartesiAutomator.sol`. This contract uses a time-based custom logic trigger. Its `performUpkeep` function calls the `InputBox.addInput()` function, kicking off your off-chain computation.

### Pattern 2: Reacting to Cartesi Inputs via Logs

-   **Goal:** Have an on-chain contract react when a new input is sent to your Cartesi dApp.
-   **Example:** Use `examples/LogTriggeredInputTracker.sol`. This contract uses a log trigger, listening for the `InputAdded` event from the Cartesi `InputBox`. This is the most efficient way to create a responsive, event-driven on-chain component for your dApp.

---

## Getting Started

### 1. Choose an Example and Deploy

Copy the example contract that fits your use case from the `/examples` directory and deploy it to your target network.

### 2. Use the Library to Register Your Upkeep

#### Installation

```bash
npm install cartesi-chainlink-lib
# or
yarn add cartesi-chainlink-lib
```

#### Example: Registering a Log-Triggered Upkeep

This example registers the `LogTriggeredInputTracker` to listen for `InputAdded` events from the Cartesi `InputBox`.

```typescript
import { Automation } from 'cartesi-chainlink-lib';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const chainId = 11155111; // Sepolia

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
