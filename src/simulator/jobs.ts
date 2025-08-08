import { ethers, Signer, Contract } from 'ethers';
import { CreateCustomUpkeepOptions, CreateLogUpkeepOptions } from '../interfaces';

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
    private _signer: Signer;
    private _provider: ethers.providers.Provider;
    private _isExecuting = false; // A lock to prevent concurrent executions

    constructor(private _options: CreateCustomUpkeepOptions, signer: Signer) {
        this._signer = signer;
        this._provider = signer.provider!;
        this._upkeepContract = new ethers.Contract(_options.upkeepContract, CustomLogicABI, this._signer);
    }

    // The handler function that will be called on every new block
    private _onNewBlock = async (blockNumber: number) => {
        if (this._isExecuting) {
            console.log(`[CustomLogicJob - ${this._options.name}] Already executing, skipping block ${blockNumber}.`);
            return;
        }

        try {
            console.log(`[CustomLogicJob - ${this._options.name}] Block ${blockNumber}: Checking upkeep...`);
            const [upkeepNeeded, performData] = await this._upkeepContract.checkUpkeep("0x");

            if (upkeepNeeded) {
                this._isExecuting = true;
                console.log(`[CustomLogicJob - ${this._options.name}] ✅ Upkeep needed. Performing...`);
                const tx = await this._upkeepContract.performUpkeep(performData, { gasLimit: this._options.gasLimit });
                const receipt = await tx.wait();
                console.log(`[CustomLogicJob - ${this._options.name}] Upkeep performed! Tx: ${receipt.transactionHash}`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[CustomLogicJob - ${this._options.name}] Error during check/perform:`, errorMessage);
        } finally {
            this._isExecuting = false;
        }
    };

    start(): void {
        console.log(`[CustomLogicJob - ${this._options.name}] Starting... Listening for new blocks.`);
        this._provider.on('block', this._onNewBlock);
    }

    stop(): void {
        console.log(`[CustomLogicJob - ${this._options.name}] Stopping...`);
        this._provider.off('block', this._onNewBlock);
    }
}


export class LogTriggerJob implements IUpkeepJob {
    private _upkeepContract: Contract;
    private _signer: Signer;
    private _provider: ethers.providers.Provider;
    private _eventFilter: ethers.EventFilter;

    constructor(private _options: CreateLogUpkeepOptions, signer: Signer) {
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
        console.log(`[LogTriggerJob - ${this._options.name}] ✅ Log detected! Preparing to perform upkeep.`);
        
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
