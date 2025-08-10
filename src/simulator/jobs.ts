import { ethers, Contract } from 'ethers';
import { CreateCustomUpkeepOptions, CreateLogUpkeepOptions } from '../interfaces.js';

const CustomLogicABI = [
    "function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)",
    "function performUpkeep(bytes calldata performData) external"
];

// A combined ABI that includes both the legacy and modern log automation interfaces.
const CombinedLogAutomationABI = [
  // Modern ILogAutomation with the full 8-field tuple
  "function checkLog((uint256 index,uint256 timestamp,bytes32 txHash,uint256 blockNumber,bytes32 blockHash,address source,bytes32[] topics,bytes data) log, bytes checkData) external view returns (bool upkeepNeeded, bytes performData)",
  // Legacy AutomationCompatibleInterface
  "function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData)",
  // Common
  "function performUpkeep(bytes calldata performData) external",
];


export interface IUpkeepJob {
    start(): void;
    stop(): void;
}

export class CustomLogicJob implements IUpkeepJob {
    private _upkeepContract: Contract;
    private _signer: ethers.Signer;
    private _provider: ethers.providers.Provider;
    private _isExecuting = false;
    private _lastProcessedBlock = 0;
    private _intervalId: NodeJS.Timeout | null = null;

    constructor(private _options: CreateCustomUpkeepOptions, signer: ethers.Signer) {
        this._signer = signer;
        this._provider = signer.provider!;
        this._upkeepContract = new Contract(this._options.upkeepContract, CustomLogicABI, this._signer);
    }

    public async start(): Promise<void> {
        console.log(`[CustomLogicJob - ${this._options.name}] Starting... Polling for new blocks every second.`);
        this._lastProcessedBlock = await this._provider.getBlockNumber();
        console.log(`[CustomLogicJob - ${this._options.name}] Initial block number: ${this._lastProcessedBlock}`);
        this._intervalId = setInterval(() => this._tick(), 1000);
    }

    private async _tick(): Promise<void> {
        if (this._isExecuting) {
            return;
        }

        try {
            this._isExecuting = true;
            const currentBlock = await this._provider.getBlockNumber();

            if (currentBlock <= this._lastProcessedBlock) {
                // No new block to process, this is expected behavior on a non-auto-mining chain
                // console.log(`[CustomLogicJob - ${this._options.name}] No new block (current: ${currentBlock}, last: ${this._lastProcessedBlock})...`);
                this._isExecuting = false; // Release lock before returning
                return;
            }

            this._lastProcessedBlock = currentBlock;

            const [upkeepNeeded, performData] = await this._upkeepContract.checkUpkeep(this._options.checkData || '0x');

            if (upkeepNeeded) {
                console.log(`[CustomLogicJob - ${this._options.name}] ✅ Upkeep needed. Performing...`);
                const tx = await this._upkeepContract.performUpkeep(performData);
                const receipt = await tx.wait();
                console.log(`[CustomLogicJob - ${this._options.name}] 🎉 Upkeep performed! Tx: ${receipt.transactionHash}`);
            }
        } catch (error: unknown) {
            let errorMessage = 'An unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null && 'message' in error) {
                errorMessage = String((error as {message: unknown}).message);
            }
            console.error(`[CustomLogicJob - ${this._options.name}] Error during check/perform: ${errorMessage}`);
            // For detailed debugging, log the full error object
            // console.error(error);
        } finally {
            this._isExecuting = false;
        }
    }

    public stop(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        console.log(`[CustomLogicJob - ${this._options.name}] Stopped.`);
    }
}


export class LogTriggerJob implements IUpkeepJob {
    private _upkeepContract: Contract;
    private _signer: ethers.Signer;
    private _provider: ethers.providers.Provider;
    private _eventFilter: ethers.EventFilter;
    private _processedLogs: Set<string> = new Set(); // For deduplication

    constructor(private _options: CreateLogUpkeepOptions, signer: ethers.Signer) {
        this._signer = signer;
        this._provider = signer.provider!;
        // Use the combined ABI to handle both legacy and modern log upkeeps
        this._upkeepContract = new ethers.Contract(_options.upkeepContract, CombinedLogAutomationABI, this._signer);

        // Create the specific event filter to listen for
        this._eventFilter = {
            address: _options.logEmitterAddress,
            topics: [ethers.utils.id(_options.logEventSignature)]
        };
    }

    // The handler that will be called ONLY when a matching log is found
    private _onLogDetected = async (log: ethers.providers.Log) => {
        const logId = `${log.transactionHash}-${log.logIndex}`;
        if (this._processedLogs.has(logId)) {
            // This is a log we have already seen and processed.
            return;
        }

        // TODO: Create a narrower event filter to avoid self-originated logs, the current commented one is too broad and doesn't reflect the actual usage of the log automation.
        // // Check if the transaction was sent by this simulator's wallet
        // const tx = await this._provider.getTransaction(log.transactionHash);
        // const signerAddress = await this._signer.getAddress();

        // if (tx && tx.from === signerAddress) {
        //     console.log(`[LogTriggerJob - ${this._options.name}] Ignoring self-originated log to prevent infinite loop.`);
        //     return;
        // }

        
        console.log(`[LogTriggerJob - ${this._options.name}] Detected log, checking for upkeep...`);

        try {
            let upkeepNeeded = false;
            let performData = "0x";

            // "Probe" for the correct check function by attempting to call checkLog first.
            try {
                // To build the full Log struct, we need the block timestamp.
                const block = await this._provider.getBlock(log.blockNumber);

                // Construct the full Log struct that the ILogAutomation interface expects.
                const logStruct = {
                    index: log.logIndex,
                    timestamp: block.timestamp,
                    txHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                    blockHash: log.blockHash,
                    source: log.address,
                    topics: log.topics,
                    data: log.data,
                };

                // For checkLog, the second argument `checkData` is typically empty.
                console.log('> [DEBUG] start checkLog');
                const result = await this._upkeepContract.callStatic.checkLog(logStruct, "0x");
                upkeepNeeded = result.upkeepNeeded;
                performData   = result.performData;
                console.log('> [DEBUG] checkLog result =', [upkeepNeeded, performData]);

            } catch (e: unknown) {
                const code = (typeof (e as { code?: unknown }).code === 'string') ? (e as { code: string }).code : undefined;
                const msg = (typeof (e as { message?: unknown }).message === 'string') ? (e as { message: string }).message : '';
                if (code === 'INVALID_ARGUMENT' || msg.includes('checkLog is not a function')) {
                    // This is likely a legacy contract, fall back to checkUpkeep.
                    console.log(`[LogTriggerJob - ${this._options.name}] 'checkLog' not found, falling back to 'checkUpkeep'.`);
                    const checkData = ethers.utils.defaultAbiCoder.encode(
                        ['bytes32[]', 'bytes'],
                        [log.topics, log.data]
                    );
                    [upkeepNeeded, performData] = await this._upkeepContract.checkUpkeep(checkData);
                } else {
                    // Re-throw other unexpected errors
                    throw e;
                }
            }

            if (upkeepNeeded) {
                console.log('> [DEBUG] gasLimit override =', this._options.gasLimit);
                console.log('> [DEBUG] performData =', performData);

                const tx = await this._upkeepContract.performUpkeep(performData, { gasLimit: this._options.gasLimit });
                const receipt = await tx.wait();
                console.log(`[LogTriggerJob - ${this._options.name}] 🎉 Upkeep performed! Tx: ${receipt.transactionHash}`);
                // After a successful perform, mark this log as processed
                this._processedLogs.add(logId);
            } else {
                console.log(`[LogTriggerJob - ${this._options.name}] Log detected, but check function returned false.`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[LogTriggerJob - ${this._options.name}] Error during perform:`, errorMessage);
        }
    };

    start(): void {
        console.log(`[LogTriggerJob - ${this._options.name}] Starting... Listening for event "${this._options.logEventSignature}" from ${this._options.logEmitterAddress}.`);
        this._provider.on(this._eventFilter, this._onLogDetected);
    }

    stop(): void {
        console.log(`[LogTriggerJob - ${this._options.name}] Stopping...`);
        this._provider.off(this._eventFilter, this._onLogDetected);
    }
}
