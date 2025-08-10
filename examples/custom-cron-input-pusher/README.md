# Custom Cron Input Pusher Example

## Use Case

**Goal**: Periodically push a fixed payload into Cartesi’s `InputBox` for a given `appContract` (e.g., every 60 seconds). This demonstrates a custom (time-based) upkeep.

## Contract

*   **`InputPusherCron.sol`**
    Implements Chainlink’s `AutomationCompatibleInterface`:

    *   `checkUpkeep(bytes)` returns `true` when `block.timestamp - lastTimestamp > interval`.
    *   `performUpkeep(bytes)` calls `InputBox.addInput(appContract, payload)` and updates `lastTimestamp`.

*   **Key design choices**:
    *   **Time-based check**: Keepers evaluate `checkUpkeep` every block (or on schedule) and only call `performUpkeep` when the interval has elapsed.
    *   **Minimal on-chain state**: Only track `lastTimestamp` and read constant `interval`/`payload`.

## Manifests

This example includes:

*   `manifests/local.jsonc`: register with the local simulator.
*   `manifests/sepolia.jsonc`: register with Chainlink Automation on Sepolia.

Both manifests set:

*   `deployment.artifact` to `../artifacts/InputPusherCron.json`
*   `deployment.constructorArgs` to `[<InputBox>, <appContract>, <intervalSecs>, <payloadBytes>]`
*   `registration.triggerType` to `"custom"`
*   `registration.upkeepContract` to `"auto"` so the CLI deploys before registering

## Local: step-by-step

1.  **Start a local chain and the simulator**
    ```bash
    anvil
    ```
    In another terminal:
    ```bash
    npx cartesi-chainlink dev start
    ```

2.  **Compile contracts and copy artifacts to `examples/custom-cron-input-pusher/artifacts/` so `InputPusherCron.json` exists.**

3.  **If you need a local `InputBox` and `appContract`, deploy them first and paste the addresses into the manifest:**
    ```bash
    npx cartesi-chainlink contract deploy ./examples/custom-cron-input-pusher/artifacts/InputBox.json \
      --private-key 0x... --network local
    ```

4.  **Edit `manifests/local.jsonc` and set:**
    *   `constructorArgs[0]` = local `InputBox` address
    *   `constructorArgs[1]` = your `appContract` address (the destination of inputs)
    *   `constructorArgs[2]` = interval in seconds (e.g., 60)
    *   `constructorArgs[3]` = payload bytes (e.g., `"0x68656c6c6f2d6c6f63616c"`)

5.  **Apply:**
    ```bash
    npx cartesi-chainlink upkeep apply \
      ./examples/custom-cron-input-pusher/manifests/local.jsonc \
      --private-key 0x...
    ```

6.  **Watch logs**: the simulator should call `performUpkeep` roughly once per interval and you should see `InputAdded` events on your local `InputBox`.

## Sepolia: step-by-step

1.  **Ensure your deployer wallet has Sepolia ETH and LINK.**

2.  **Compile and ensure `InputPusherCron.json` is in `examples/custom-cron-input-pusher/artifacts/`.**

3.  **Edit `manifests/sepolia.jsonc`:**
    *   Set the real Sepolia `InputBox` and `appContract` addresses
    *   Set a sensible interval and payload
    *   Ensure `initialFunds` is set (e.g., `"2.0"` LINK)

4.  **Apply:**
    ```bash
    npx cartesi-chainlink upkeep apply \
      ./examples/custom-cron-input-pusher/manifests/sepolia.jsonc \
      --rpc-url https://sepolia.yourrpc.example \
      --private-key 0x...
    ```
5.  **After a keeper turn, observe `InputAdded` events appearing periodically.**

## Troubleshooting

*   **Nothing happens (local)**: Make sure the simulator is running and the manifest has `mode: "local"`.
*   **Funding**: Local mode needs no LINK. Sepolia requires `initialFunds` and a funded LINK balance.
*   **Deployment artifact issues**: If you see errors about bytecode, ensure your artifact JSON has either `bytecode` (Hardhat) or `evm.bytecode.object` (Foundry), and that you pointed the manifest to the contract-level JSON file.

## Notes on artifacts and manifests

*   The CLI resolves `deployment.artifact` relative to the manifest file. Keep artifacts in `examples/<case>/artifacts/` to make paths short and portable.
*   When `registration.upkeepContract` is `"auto"`, the CLI deploys the upkeep contract first and uses its address during registration.
*   For log upkeeps, ensure:
    *   `registration.logEmitterAddress` is the contract that emits the log (`InputBox`)
    *   `registration.logEventSignature` matches exactly the Solidity event signature (no spaces, no `indexed`)

If you want, I can also drop in minimal example manifests and confirm they resolve properly against your repo paths.
