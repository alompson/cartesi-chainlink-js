# Log InputBox Counter Example

## Use Case

**Goal**: Increase a `Counter` every time the Cartesi `InputBox` emits an `InputAdded(appContract,index,bytes)` log for a specific `appContract`. This demonstrates a log-triggered upkeep that reacts to events and passes decoded log data to `performUpkeep`.

## Contracts

*   **`Counter.sol`**
    Minimal counter with `increment()`.

*   **`InputBoxLogCounter.sol`**
    Implements the log automation interface:

    *   `checkLog(Log calldata log, bytes calldata checkData)` decodes topics and data of the `InputAdded` event and returns `performData`.
    *   `performUpkeep(bytes calldata performData)` validates and increments the counter.

*   **Key design choices:**
    *   **Event-driven**: `checkLog` is called off-chain by keepers with the exact log your upkeep registered for. It can do decoding and pre-validation, and returns the data needed by `performUpkeep`.
    *   **Stateless perform**: `performUpkeep` re-validates inputs as needed and applies the state change (increment).

## Manifests

This example includes:

*   `manifests/local.jsonc`: register with the local simulator.
*   `manifests/sepolia.jsonc`: register with Chainlink Automation on Sepolia.

Both manifests set:

*   `deployment.artifact` to `../artifacts/InputBoxLogCounter.json`
*   `deployment.constructorArgs` to `[<InputBox>, <appContract>, <Counter>]`
*   `registration.triggerType` to `"log"`
*   `registration.logEmitterAddress` set to the `InputBox` address
*   `registration.logEventSignature` set to `"InputAdded(address,uint256,bytes)"`

The CLI will auto-deploy `InputBoxLogCounter` because `upkeepContract` is `"auto"`.

## Local: step-by-step

1.  **Start a local chain and the simulator**
    ```bash
    anvil
    ```
    In another terminal:
    ```bash
    npx cartesi-chainlink dev start
    ```

2.  **Compile contracts (Hardhat or Foundry) and copy artifacts to `examples/log-inputbox-counter/artifacts/`**
    Make sure `InputBoxLogCounter.json` and `Counter.json` exist there.

3.  **Deploy dependencies (if you need to)**
    If you don’t already have a `Counter` and `InputBox`, deploy them first and plug their addresses in the manifest:
    ```bash
    npx cartesi-chainlink contract deploy ./examples/log-inputbox-counter/artifacts/Counter.json \
      --private-key 0x... --network local

    # use your own InputBox or a demo InputBox
    npx cartesi-chainlink contract deploy ./examples/log-inputbox-counter/artifacts/InputBox.json \
      --private-key 0x... --network local
    ```
4.  **Edit `manifests/local.jsonc` and set the constructor args to the addresses from step 3.**

5.  **Apply the manifest**
    ```bash
    npx cartesi-chainlink upkeep apply \
      ./examples/log-inputbox-counter/manifests/local.jsonc \
      --private-key 0x...
    ```
6.  **Exercise the flow**
    Call `InputBox.addInput(appContract, payload)` from any account.
    You should see the simulator detect the log and call `performUpkeep`, incrementing your `Counter`.

## Sepolia: step-by-step

1.  **Ensure you have:**
    *   `RPC_URL` for Sepolia
    *   Private key funded with ETH and LINK

2.  **Compile and produce artifacts in `examples/log-inputbox-counter/artifacts/`.**

3.  **Deploy dependencies (`Counter` and the actual `InputBox` or point to an existing one):**
    ```bash
    npx cartesi-chainlink contract deploy ./examples/log-inputbox-counter/artifacts/Counter.json \
      --network sepolia --private-key 0x...
    ```

4.  **Edit `manifests/sepolia.jsonc`:**
    *   Put the actual `InputBox` address (emitter)
    *   Put your `appContract` and `Counter` addresses
    *   Ensure `initialFunds` is set (e.g., `"2.0"` LINK)

5.  **Apply the manifest**
    ```bash
    npx cartesi-chainlink upkeep apply \
      ./examples/log-inputbox-counter/manifests/sepolia.jsonc \
      --rpc-url https://sepolia.yourrpc.example \
      --private-key 0x...
    ```

6.  **Trigger `InputBox.addInput(appContract, payload)` on Sepolia.**
    After a keeper turn, your `Counter` should increment.

## Troubleshooting

*   **No logs detected (local)**: Confirm the simulator is running and your manifest’s `logEmitterAddress` equals the contract actually emitting the event.
*   **Wrong signature**: The event signature must be exactly `InputAdded(address,uint256,bytes)`.
*   **Gas**: If `performUpkeep` runs out of gas, increase `registration.gasLimit` in the manifest.
