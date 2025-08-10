# Overview

This folder contains end-to-end, production-style examples that show how to use the library and CLI to:

*   Compile and deploy upkeep contracts from artifacts
*   Register upkeeps with either the local simulator or Chainlink Automation on Sepolia
*   Drive both log-triggered and custom (cron/time-based) automation patterns

Each example includes:

*   `contracts/` – Solidity sources for the example upkeep(s) and helpers
*   `artifacts/` – Compiled artifacts (JSON) used by the CLI deployer
*   `manifests/` – JSONC files that define how to deploy and register an upkeep
*   `README.md` – A focused guide for that particular use case

# Folder layout

```
examples/
  log-inputbox-counter/
    contracts/
      Counter.sol
      InputBoxLogCounter.sol
    artifacts/
      Counter.json
      InputBoxLogCounter.json
    manifests/
      local.jsonc
      sepolia.jsonc
    README.md

  custom-cron-input-pusher/
    contracts/
      InputPusherCron.sol
    artifacts/
      InputPusherCron.json
    manifests/
      local.jsonc
      sepolia.jsonc
    README.md
```

# What the CLI does

`cartesi-chainlink upkeep apply <manifest.jsonc>`

*   Validates the manifest against the schema
*   Optionally deploys the upkeep contract if `registration.upkeepContract` is `"auto"`
*   Registers the upkeep with the local simulator (`mode: "local"`) or Chainlink on Sepolia (`mode: "chainlink"`)
*   Writes a `<manifest>.state.json` file with the deployed address and created `upkeepId`

`cartesi-chainlink contract deploy <artifact.json>`
Deploy a contract manually from an artifact if you want to pre-deploy dependencies (e.g., `Counter`).

`cartesi-chainlink upkeep show <upkeepId>`, `upkeep fund <upkeepId>`, etc.
Convenience commands to manage/inspect upkeeps.

# Local vs On-Chain (Sepolia)

**Local (`network.mode: "local"`):**
Uses the built-in simulator. No LINK required. You must run:

*   A local chain (`anvil` or `hardhat node`)
*   The simulator (`cartesi-chainlink dev start`)

**Sepolia (`network.mode: "chainlink"`):**
Uses the real Chainlink Automation network. You must have:

*   An RPC URL for Sepolia
*   A private key funded with ETH (for gas) and LINK (for initial upkeep funds)
