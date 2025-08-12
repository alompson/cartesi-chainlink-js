import { ethers, Contract, BigNumber } from 'ethers';
import { CreateCustomUpkeepOptions, CreateLogUpkeepOptions } from '../interfaces.js';

const CustomLogicABI = [
    "function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)",
    "function performUpkeep(bytes calldata performData) external"
];

// A combined ABI that includes both the legacy and modern log automation interfaces.
const CombinedLogAutomationABI = [
  // Modern ILogAutomation with the full 8-field tuple
  "function checkLog((uint256 index,uint256 timestamp,bytes32 txHash,uint256 blockNumber,bytes32 blockHash,address source,bytes32[] topics,bytes data) log, bytes checkData) external view returns (bool upkeepNeeded, bytes performData)",
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

// Helper: event signature -> topic0
function topic0FromSignature(sig: string): string {
    return ethers.utils.id(sig);
  }
  
  // Helper: address -> 32-byte topic (topic1)
  function addressToTopic(addr: string): string {
    return ethers.utils.hexZeroPad(addr, 32);
  }
  
  // Helper: number/bigint -> 32-byte topic (topic2, topic3, etc.)
  function uintToTopic(n: number | bigint): string {
    const bn = ethers.BigNumber.from(n);
    return ethers.utils.hexZeroPad(ethers.utils.hexlify(bn), 32);
  }

export class LogTriggerJob {
  private _upkeepContract: Contract;
  private _signer: ethers.Signer;
  private _provider: ethers.providers.Provider;

  // Provider filter (v5 accepts nulls for wildcards)
  private _eventFilter: ethers.providers.Filter;

  private _processedLogs = new Set<string>();

  constructor(private _options: CreateLogUpkeepOptions, signer: ethers.Signer) {
    this._signer = signer;
    this._provider = signer.provider!;

    this._upkeepContract = new Contract(
      _options.upkeepContract,
      CombinedLogAutomationABI,
      this._signer
    );

    // Build topics with proper typing and null wildcards
    const topic0 = topic0FromSignature(_options.logEventSignature);
    const t1 = _options.logTopicFilters?.[0]
      ? addressToTopic(_options.logTopicFilters[0] as string)
      : null;
    const t2 = _options.logTopicFilters?.[1]
      ? uintToTopic(BigInt(_options.logTopicFilters[1] as string))
      : null;
    const t3 = _options.logTopicFilters?.[2]
      ? uintToTopic(BigInt(_options.logTopicFilters[2] as string))
      : null;

    const topics: (string | string[] | null)[] = [topic0, t1, t2, t3];

    this._eventFilter = {
      address: _options.logEmitterAddress,
      topics
    };
  }

  private _onLogDetected = async (log: ethers.providers.Log) => {
    const logId = `${log.transactionHash}-${log.logIndex}`;
    if (this._processedLogs.has(logId)) return;

    try {
      // Build ILogAutomation.Log struct with uint256 as BigNumber
      const block = await this._provider.getBlock(log.blockNumber);

      const logStruct = {
        index: BigNumber.from(log.logIndex),
        timestamp: BigNumber.from(block.timestamp),
        txHash: log.transactionHash as string,
        blockNumber: BigNumber.from(log.blockNumber),
        blockHash: log.blockHash as string,
        source: log.address,
        topics: log.topics,
        data: log.data
      };

      let upkeepNeeded = false;
      let performData = '0x';

      try {
        type CheckLogObj = { upkeepNeeded?: boolean; performData?: string } & [boolean, string];

        const ret = (await this._upkeepContract.callStatic.checkLog(
          logStruct,
          '0x'
        )) as CheckLogObj;
        
        const needed = ret.upkeepNeeded ?? ret[0];
        const pData  = ret.performData  ?? ret[1];

        upkeepNeeded = Boolean(needed);
        performData  = typeof pData === 'string' ? pData : '0x';
      } catch (e) {
        throw e;
      }

      if (upkeepNeeded) {
        const tx = await this._upkeepContract.performUpkeep(performData, {
          gasLimit: this._options.gasLimit
        });
        await tx.wait();
        this._processedLogs.add(logId);
      }
    } catch (err) {
      console.error(
        `[LogTriggerJob - ${this._options.name}]`,
        (err as Error).message
      );
    }
  };

  start(): void {
    this._provider.on(this._eventFilter, this._onLogDetected);
  }

  stop(): void {
    this._provider.off(this._eventFilter, this._onLogDetected);
  }
}