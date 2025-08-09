# Chainlink Upkeep Manifests

This directory contains example manifest files for deploying and registering Chainlink Automation upkeeps using the declarative JSON approach.

## Overview

The manifest system allows you to define upkeep configurations in JSON files and apply them using the CLI, without writing TypeScript/JavaScript code. This provides a more declarative and reproducible way to manage upkeeps.

## Manifest Structure

Each manifest file contains:

- **network**: Network configuration (mode: 'local' | 'chainlink', chainId)
- **deployment** (optional): Contract deployment configuration
- **registration**: Upkeep registration parameters

## Examples

### Local Mode Examples

#### `time-based.local.json`
Example of a custom logic upkeep that deploys a contract from an artifact file.
```bash
npx cartesi-chainlink upkeep apply examples/manifests/time-based.local.json --private-key $PRIVATE_KEY_LOCAL
```

#### `inputbox-log.local.json`
Example of a log-triggered upkeep using a pre-deployed contract.
```bash
npx cartesi-chainlink upkeep apply examples/manifests/inputbox-log.local.json --private-key $PRIVATE_KEY_LOCAL
```

#### `counter-cron.local.json`
Realistic example using the existing AutomatedCounterCron from the examples.
```bash
npx cartesi-chainlink upkeep apply examples/manifests/counter-cron.local.json --private-key $PRIVATE_KEY_LOCAL
```

### Chainlink Mode Example

#### `counter-log.sepolia.json`
Example of deploying and registering on Sepolia testnet.
```bash
npx cartesi-chainlink upkeep apply examples/manifests/counter-log.sepolia.json \
  --network sepolia \
  --private-key $PRIVATE_KEY_SEPOLIA
```

## Usage

### Prerequisites

1. Install dependencies: `yarn install`
2. Build the project: `yarn build`
3. For local mode: Start the simulator with `npx cartesi-chainlink dev start`
4. For chainlink mode: Ensure you have LINK tokens for funding

### CLI Commands

```bash
# Apply a manifest file
npx cartesi-chainlink upkeep apply <manifest-file> --private-key <key> [--network <network>]

# Dry run (validate without executing)
npx cartesi-chainlink upkeep apply <manifest-file> --private-key <key> --dry-run

# Help
npx cartesi-chainlink upkeep apply --help
```

### Alternative: Generate Templates

You can also generate manifest templates using the CLI:

```bash
# Generate a custom logic manifest
npx cartesi-chainlink util init --type custom --network local --output my-custom.json

# Generate a log trigger manifest  
npx cartesi-chainlink util init --type log --network sepolia --output my-log.json

# Validate an existing manifest
npx cartesi-chainlink util validate my-manifest.json
```

### Contract Deployment

When `upkeepContract` is set to `"auto"`, the system will:

1. Deploy the contract using the artifact file specified in `deployment.artifact`
2. Use the provided `constructorArgs` for deployment
3. Register the upkeep with the deployed contract address

### State Files

After successful application, a `.state.json` file is created next to the manifest containing:
- Deployed contract address
- Upkeep ID
- Network information
- Timestamp

## Manifest Schema

### Network
```json
{
  "mode": "local" | "chainlink",
  "chainId": number
}
```

### Deployment (optional)
```json
{
  "artifact": "path/to/artifact.json",  // Relative to manifest file
  "constructorArgs": [...]              // Optional constructor arguments
}
```

### Registration
```json
{
  "name": "string",
  "upkeepContract": "auto" | "0x...",   // "auto" for deployment, address for existing
  "gasLimit": number,
  "triggerType": "custom" | "log",
  "initialFunds": "string",             // Required for chainlink mode
  // For log triggers only:
  "logEmitterAddress": "0x...",
  "logEventSignature": "EventName(...)",
  "logTopicFilters": [null, null, null] // Optional 3-element array
}
```

## Network Shortcuts

The unified CLI supports network shortcuts for common networks:

```bash
# Local development
npx cartesi-chainlink upkeep apply manifest.json --network local --private-key 0x...

# Ethereum Sepolia
npx cartesi-chainlink upkeep apply manifest.json --network sepolia --private-key 0x...

# Arbitrum One
npx cartesi-chainlink upkeep apply manifest.json --network arbitrum --private-key 0x...

# Custom RPC (for any network)
npx cartesi-chainlink upkeep apply manifest.json --rpc-url https://custom-rpc.com --private-key 0x...
```

Use `npx cartesi-chainlink network list` to see all supported network shortcuts.

## Tips

1. **Artifact Paths**: Use relative paths from the manifest file location
2. **Constructor Args**: Include all required constructor parameters in order
3. **Gas Limits**: Set appropriate gas limits for your upkeep operations
4. **Initial Funds**: For chainlink mode, provide sufficient LINK for upkeep execution
5. **State Tracking**: Keep `.state.json` files for tracking deployed contracts and upkeeps
6. **Local Testing**: Always test with local mode first before deploying to live networks
7. **Validation**: Use `npx cartesi-chainlink util validate` to check manifest syntax before deployment 