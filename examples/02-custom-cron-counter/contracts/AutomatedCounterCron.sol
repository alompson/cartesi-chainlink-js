// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AutomationCompatibleInterface
} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

interface ICounter {
    function incAutomated() external;
}

/**
 * @title TimeBasedCounterUpkeep
 * @notice A minimal, time-based upkeep that calls Counter.incAutomated() at a fixed interval.
 *
 * Why this design:
 * - Uses AutomationCompatibleInterface (custom-logic trigger)
 * - Stores immutable config (counter address, interval) for gas
 * - Keeps `checkUpkeep` read-only, cheap, and deterministic
 * - Returns `performData` from `checkUpkeep` to avoid recomputing in `performUpkeep`
 * - Re-validates minimally in `performUpkeep` to prevent race/early calls
 * - Emits events for observability
 */
contract TimeBasedCounterUpkeep is AutomationCompatibleInterface {
    /// @dev Minimal reverts keep bytecode small and save gas.
    error NotReady();
    error IntervalIsZero();
    error ZeroCounter();

    /// @notice Counter to automate.
    ICounter public immutable i_counter;

    /// @notice Required seconds between runs.
    uint256 public immutable i_interval;

    /// @notice Last time the upkeep successfully ran.
    uint256 public s_lastTimestamp;

    event Performed(uint256 timestamp);

    /**
     * @param counter Address of the Counter contract to automate.
     * @param interval Seconds between runs (must be > 0).
     */
    constructor(address counter, uint256 interval) {
        if (counter == address(0)) revert ZeroCounter();
        if (interval == 0) revert IntervalIsZero();

        i_counter = ICounter(counter);
        i_interval = interval;
        s_lastTimestamp = block.timestamp;
    }

    /**
     * @notice Off-chain simulation by Automation nodes.
     * @dev Keep this VIEW and cheap:
     *      - Read-only checks (no storage writes)
     *      - Deterministic (don’t rely on flaky oracles or randomness here)
     *      - Return pre-encoded performData so we don’t recompute in performUpkeep
     */
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Simple time window check
        upkeepNeeded = (block.timestamp - s_lastTimestamp) >= i_interval;

        // Pre-encode the target action; it’s tiny and deterministic.
        // (You could pass additional args here if the target method had any.)
        performData = upkeepNeeded
            ? abi.encodeWithSelector(ICounter.incAutomated.selector)
            : bytes("");

        // NOTE: We intentionally do not read & pass “dynamic” data that could
        //       change between check and perform; keep performUpkeep robust.
    }

    /**
     * @notice On-chain execution when nodes decide it’s ready.
     * @dev Re-validate minimally to avoid early calls (race conditions).
     *      Don’t duplicate heavy checks—just gate by time again.
     */
    function performUpkeep(bytes calldata performData) external override {
        // Re-check the time window to prevent premature/direct calls.
        if ((block.timestamp - s_lastTimestamp) < i_interval) {
            revert NotReady();
        }

        // Update first to avoid reentrancy making us double-run in the same block.
        s_lastTimestamp = block.timestamp;

        // Execute the pre-encoded call (type-safe interface is cheaper/cleaner).
        // We *could* decode performData and low-level call, but we know what we want:
        // abi.decode(performData, (bytes4)) == ICounter.incAutomated.selector
        // Calling directly via interface is simpler and saves a bit of gas.
        i_counter.incAutomated();

        emit Performed(block.timestamp);
    }
}
