# Cartesi Chainlink Library

A comprehensive TypeScript library and CLI toolkit for integrating Chainlink Automation with Cartesi dApps, featuring a powerful local simulator for seamless development and testing.

Full presentation for Cartesi Grant: https://drive.google.com/drive/folders/1x_F99vyokLng81cPk3prlvkkJURzFivn?usp=sharing

## 🚀 Overview

This library provides everything you need to work with Chainlink Automation:

- **📦 TypeScript Library**: Strongly-typed API for creating and managing upkeeps
- **🏠 Local Simulator**: Test automation locally without testnets or LINK tokens  
- **🔧 Unified CLI**: Deploy contracts, register upkeeps, and manage your automation workflow
- **📋 Manifest System**: Declarative JSON configuration for reproducible deployments
- **🎯 Cartesi Integration**: Ready-to-use examples for InputBox automation

## 💡 Why This Matters for Cartesi Developers

Cartesi dApps often need off-chain computation triggers — moments when something in the blockchain world signals that your Cartesi machine should process data, advance its state, or interact with users.

Common trigger types in Cartesi workflows include:

- **Cartesi InputBox events** — e.g., the `InputAdded` event signals that new input data is ready for processing
- **Time-based tasks** — e.g., periodic data aggregation, daily settlements, or machine maintenance jobs  
- **Custom state conditions** — e.g., start a computation only if a certain state threshold is reached

Traditionally, developers must:
- Deploy & fund each upkeep manually via the Chainlink UI
- Keep track of upkeep IDs across staging, testnet, and mainnet
- Re-deploy and re-register every time the upkeep contract changes
- Write custom scripts to test upkeep logic against live networks

This library removes that friction by:
- **Single Source of Truth** – Define deployment & registration in one JSON manifest
- **Environment Parity** – Use the same manifest for local simulation and live Chainlink networks
- **Bulk & Repeatable** – Register multiple upkeeps from CLI or code without UI clicks
- **Cartesi-Ready Templates** – Out-of-the-box examples for InputBox listeners, event-driven dApps, and cron-style automations

With this library, Cartesi developers can:
- Run the full Cartesi + Chainlink automation flow locally on Anvil/Hardhat before touching a testnet
- Quickly iterate on upkeep logic without manual re-registration
- Deploy and register multiple upkeeps programmatically (e.g., one upkeep per dApp instance)
- Combine log triggers (InputBox events) with time-based triggers for hybrid automation

## 🛠️ Installation

```bash
npm install cartesi-chainlink-lib
# or
yarn add cartesi-chainlink-lib
```

## 📚 Quick Start

### 1. Choose Your Approach

**🏠 Local Development** (Recommended for testing)
```bash
# Start local blockchain
anvil

# Start the simulator in another terminal  
npx cartesi-chainlink dev start

# Deploy and register your upkeep
npx cartesi-chainlink upkeep apply my-manifest.json --private-key 0x...
```

**🌐 Live Networks** (Sepolia, Mainnet, etc.)
```bash
# Deploy to live network
npx cartesi-chainlink upkeep apply my-manifest.json \
  --network sepolia \
  --private-key 0x...
```

### 2. Generate a Manifest Template

```bash
# Create a log-triggered upkeep template
npx cartesi-chainlink util init --type log --output my-upkeep.json

# Create a custom logic (cron-style) upkeep template  
npx cartesi-chainlink util init --type custom --output my-cron.json
```

### 3. Using the Library in Code

```typescript
import { Automation } from 'cartesi-chainlink-lib';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = new ethers.Wallet('0x...', provider);

// For local testing
const automation = new Automation({
    signer,
    chainId: 31337,
    mode: 'local'
});

// For live networks  
const automation = new Automation({
    signer, 
    chainId: 11155111, // Sepolia
    mode: 'chainlink'
});

// Register an upkeep
const { upkeepId } = await automation.createUpkeep({
    name: 'My Automation',
    upkeepContract: '0x...',
    gasLimit: 500_000,
    triggerType: 'custom',
    initialFunds: '10.0' // LINK tokens (not needed for local mode)
});
```

## 🏗️ CLI Commands

### Development Commands

```bash
# Start the local simulator with interactive setup
npx cartesi-chainlink dev start

# Check simulator status  
npx cartesi-chainlink dev status

# Stop the simulator
npx cartesi-chainlink dev stop
```

### Upkeep Management

```bash
# Deploy and register from manifest
npx cartesi-chainlink upkeep apply manifest.json --private-key 0x...

# Register upkeep directly
npx cartesi-chainlink upkeep register \
  --name "My Upkeep" \
  --contract 0x... \
  --trigger custom \
  --gas-limit 500000

# List registered upkeeps
npx cartesi-chainlink upkeep list

# Show upkeep details
npx cartesi-chainlink upkeep show <upkeep-id>

# Add funds to upkeep
npx cartesi-chainlink upkeep fund <upkeep-id> --amount 5.0
```

### Network Information

```bash
# List all supported networks
npx cartesi-chainlink network list

# Test network connectivity
npx cartesi-chainlink network test --rpc-url https://...

# Show network details
npx cartesi-chainlink network show --chain-id 11155111
```

### Utility Commands

```bash
# Generate manifest templates
npx cartesi-chainlink util init --type log --network local

# Validate manifest files
npx cartesi-chainlink util validate manifest.json

# Show CLI version and status
npx cartesi-chainlink util version
```

### Contract Management

```bash
# Deploy contract from artifact
npx cartesi-chainlink contract deploy artifact.json --args "0x..." 100

# Verify deployed contract
npx cartesi-chainlink contract verify 0x... --network sepolia

# Check contract compatibility
npx cartesi-chainlink contract check 0x...
```

## 📋 Manifest System

The manifest system allows you to define your entire deployment and registration process in a single JSON file:

```json
{
  "version": "1",
  "network": {
    "mode": "local",
    "chainId": 31337
  },
  "deployment": {
    "artifact": "./artifacts/MyUpkeep.json",
    "constructorArgs": ["0x123...", 60]
  },
  "registration": {
    "name": "Counter Automation",
    "upkeepContract": "auto",
    "gasLimit": 300000,
    "triggerType": "custom"
  }
}
```

Key features:
- **Auto-deployment**: Set `upkeepContract: "auto"` to deploy from artifacts
- **Network flexibility**: Works with both local and live networks
- **Type validation**: Full Zod schema validation with helpful error messages
- **State tracking**: Generates `.state.json` files for deployed contracts

## 🎯 Chainlink Automation Types

### Custom Logic Upkeeps
Perfect for time-based automation, periodic tasks, or custom conditional logic:

```typescript
// Your contract implements checkUpkeep and performUpkeep
contract MyUpkeep is AutomationCompatibleInterface {
    uint256 public lastTimeStamp;
    uint256 public immutable interval;
    
    function checkUpkeep(bytes calldata) external view override 
        returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }
    
    function performUpkeep(bytes calldata) external override {
        lastTimeStamp = block.timestamp;
        // Your automation logic here
    }
}
```

### Log-Triggered Upkeeps  
Automatically respond to blockchain events:

```typescript
// Your contract implements ILogAutomation
contract LogUpkeep is ILogAutomation {
    function checkLog(Log calldata log, bytes calldata) external override 
        returns (bool upkeepNeeded, bytes memory performData) {
        // Validate the log and return automation data
        return (true, abi.encode(log.data));
    }
    
    function performUpkeep(bytes calldata performData) external override {
        // Process the event data
    }
}
```

## 🏠 Local Development

The local simulator provides a complete Chainlink Automation environment on your machine:

### How It Works
1. **Simulator Service**: Connects to your local blockchain (Anvil/Hardhat)
2. **Block Monitoring**: Watches for new blocks and events
3. **Upkeep Execution**: Automatically calls your contracts when conditions are met
4. **No LINK Required**: No token funding needed for local testing

### Best Practices
- Start with local testing before deploying to live networks
- Use the same contract code for local and live environments
- Test both happy path and edge cases locally
- Verify gas limits work for your specific use case

## 🌐 Live Network Support

Supports all major Chainlink Automation networks:

- **Ethereum**: Mainnet, Sepolia
- **Arbitrum**: One, Sepolia  
- **Polygon**: Mainnet
- **Base**: Mainnet, Sepolia
- **Optimism**: Mainnet, Sepolia
- **Avalanche**: Mainnet, Fuji
- **BNB Chain**: Mainnet, Testnet
- **And many more...**

Use `npx cartesi-chainlink network list` for the complete list.

## 📦 Examples

The `examples/` directory contains complete, runnable examples.
Each example includes:
- Solidity contracts
- Deployment artifacts
- JSON manifest configurations
- Step-by-step README instructions

## 🧪 Testing

```bash
# Run the test suite
yarn test

# Run with coverage
yarn test --coverage

# Lint the codebase
yarn lint

# Type check
yarn typecheck
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `yarn test`
5. Submit a pull request

## 📄 License

MIT - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Chainlink Automation Documentation](https://docs.chain.link/chainlink-automation)
- [Cartesi Documentation](https://docs.cartesi.io/)
- [GitHub Repository](https://github.com/your-org/cartesi-chainlink-lib)

---

**Need help?** Check the examples, run `npx cartesi-chainlink --help`, or open an issue on GitHub.
