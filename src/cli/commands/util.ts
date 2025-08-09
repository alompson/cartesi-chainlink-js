import type { Argv } from 'yargs';
import fs from 'fs';
import path from 'path';
import { ManifestSchema } from '../../manifest/schema.js';

interface UtilInitArgs {
  type?: 'log' | 'custom';
  network?: string;
  output?: string;
}

interface UtilValidateArgs {
  file: string;
}

// Template manifests
const LOG_TRIGGER_TEMPLATE = {
  version: "1",
  network: {
    mode: "local" as const,
    chainId: 31337
  },
  deployment: {
    artifact: "./artifacts/MyLogUpkeep.json",
    constructorArgs: ["0xEMITTER_CONTRACT_ADDRESS"]
  },
  registration: {
    name: "My Log Trigger Upkeep",
    upkeepContract: "auto" as const,
    gasLimit: 500000,
    triggerType: "log" as const,
    logEmitterAddress: "0xEMITTER_CONTRACT_ADDRESS",
    logEventSignature: "MyEvent(address,uint256)"
  }
};

const CUSTOM_TRIGGER_TEMPLATE = {
  version: "1",
  network: {
    mode: "local" as const,
    chainId: 31337
  },
  deployment: {
    artifact: "./artifacts/MyCustomUpkeep.json",
    constructorArgs: ["0xTARGET_CONTRACT_ADDRESS", 60]
  },
  registration: {
    name: "My Custom Logic Upkeep",
    upkeepContract: "auto" as const,
    gasLimit: 300000,
    triggerType: "custom" as const
  }
};

const CHAINLINK_LOG_TEMPLATE = {
  version: "1",
  network: {
    mode: "chainlink" as const,
    chainId: 11155111
  },
  deployment: {
    artifact: "./artifacts/MyLogUpkeep.json",
    constructorArgs: ["0xEMITTER_CONTRACT_ADDRESS"]
  },
  registration: {
    name: "My Sepolia Log Upkeep",
    upkeepContract: "auto" as const,
    gasLimit: 500000,
    triggerType: "log" as const,
    initialFunds: "2.0",
    logEmitterAddress: "0xEMITTER_CONTRACT_ADDRESS",
    logEventSignature: "MyEvent(address,uint256)"
  }
};

const CHAINLINK_CUSTOM_TEMPLATE = {
  version: "1",
  network: {
    mode: "chainlink" as const,
    chainId: 11155111
  },
  deployment: {
    artifact: "./artifacts/MyCustomUpkeep.json",
    constructorArgs: ["0xTARGET_CONTRACT_ADDRESS", 300]
  },
  registration: {
    name: "My Sepolia Custom Upkeep",
    upkeepContract: "auto" as const,
    gasLimit: 300000,
    triggerType: "custom" as const,
    initialFunds: "2.0"
  }
};

async function handleUtilInit(args: UtilInitArgs): Promise<void> {
  try {
    const { type = 'custom', network = 'local', output } = args;
    
    console.log(`🎬 Initializing manifest template...`);
    console.log(`   Type: ${type}`);
    console.log(`   Network: ${network}`);

    // Select template based on type and network
    let template: { network: { chainId: number; mode: string }; [key: string]: unknown };
    if (network === 'local') {
      template = JSON.parse(JSON.stringify(type === 'log' ? LOG_TRIGGER_TEMPLATE : CUSTOM_TRIGGER_TEMPLATE));
    } else {
      template = JSON.parse(JSON.stringify(type === 'log' ? CHAINLINK_LOG_TEMPLATE : CHAINLINK_CUSTOM_TEMPLATE));
      // Update chainId for common networks
      if (network === 'mainnet') template.network.chainId = 1;
      else if (network === 'arbitrum') template.network.chainId = 42161;
      else if (network === 'polygon') template.network.chainId = 137;
      else if (network === 'base') template.network.chainId = 8453;
    }

    // Update network mode for non-local networks
    if (network !== 'local') {
      template.network.mode = 'chainlink';
    }

    // Generate filename if not specified
    const filename = output || `${type}-${network}-upkeep.json`;
    
    // Check if file already exists
    if (fs.existsSync(filename)) {
      console.log(`⚠️  File ${filename} already exists!`);
      console.log(`💡 Use a different --output filename or remove the existing file.`);
      return;
    }

    // Write the template
    fs.writeFileSync(filename, JSON.stringify(template, null, 2));
    
    console.log(`✅ Template created: ${filename}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Edit ${filename} to configure your upkeep`);
    console.log(`   2. Update contract addresses and constructor arguments`);
    console.log(`   3. Ensure your artifact file exists at the specified path`);
    console.log(`   4. Apply with: cartesi-chainlink upkeep apply ${filename} --private-key <key>`);
    
    if (type === 'log') {
      console.log(`\n💡 Log Trigger Tips:`);
      console.log(`   - Set logEmitterAddress to the contract that emits the event`);
      console.log(`   - Use exact event signature: EventName(type1,type2,...)`);
      console.log(`   - Optional: Add logTopicFilters for additional filtering`);
    } else {
      console.log(`\n💡 Custom Logic Tips:`);
      console.log(`   - Implement checkUpkeep() in your contract`);
      console.log(`   - Return true when upkeep is needed`);
      console.log(`   - Implement performUpkeep() to execute the action`);
    }

  } catch (error) {
    console.error(`❌ Error creating template: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUtilValidate(args: UtilValidateArgs): Promise<void> {
  try {
    const { file } = args;
    
    console.log(`🔍 Validating manifest: ${file}`);
    
    // Check if file exists
    if (!fs.existsSync(file)) {
      throw new Error(`Manifest file not found: ${file}`);
    }

    // Read and parse the file
    let rawManifest: unknown;
    try {
      const content = fs.readFileSync(file, 'utf8');
      rawManifest = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Validate against schema
    try {
      const manifest = ManifestSchema.parse(rawManifest);
      console.log(`✅ Manifest is valid!`);
      
      // Show summary
      console.log(`\n📋 Manifest Summary:`);
      console.log(`   Name: ${manifest.registration.name}`);
      console.log(`   Type: ${manifest.registration.triggerType}`);
      console.log(`   Network: ${manifest.network.mode} (${manifest.network.chainId})`);
      console.log(`   Contract: ${manifest.registration.upkeepContract}`);
      console.log(`   Gas Limit: ${manifest.registration.gasLimit.toLocaleString()}`);
      
      if (manifest.deployment) {
        console.log(`   Deployment: ${manifest.deployment.artifact ? 'From artifact' : 'From template'}`);
        if (manifest.deployment.constructorArgs && manifest.deployment.constructorArgs.length > 0) {
          console.log(`   Constructor Args: ${manifest.deployment.constructorArgs.length} argument(s)`);
        }
      }
      
      if (manifest.registration.triggerType === 'log') {
        console.log(`   Log Emitter: ${manifest.registration.logEmitterAddress}`);
        console.log(`   Log Event: ${manifest.registration.logEventSignature}`);
      }
      
      if (manifest.network.mode === 'chainlink') {
        console.log(`   Initial Funds: ${manifest.registration.initialFunds} LINK`);
      }

      // Check for potential issues
      console.log(`\n🔍 Validation Checks:`);
      
      // Check artifact path
      if (manifest.deployment?.artifact) {
        const manifestDir = path.dirname(file);
        const artifactPath = path.resolve(manifestDir, manifest.deployment.artifact);
        if (fs.existsSync(artifactPath)) {
          console.log(`   ✅ Artifact file exists: ${manifest.deployment.artifact}`);
        } else {
          console.log(`   ⚠️  Artifact file not found: ${manifest.deployment.artifact}`);
          console.log(`      Expected at: ${artifactPath}`);
        }
      }
      
      // Check addresses format (if not auto)
      if (manifest.registration.upkeepContract !== 'auto') {
        if (/^0x[a-fA-F0-9]{40}$/.test(manifest.registration.upkeepContract)) {
          console.log(`   ✅ Upkeep contract address format is valid`);
        } else {
          console.log(`   ❌ Invalid upkeep contract address format`);
        }
      }
      
      // Check log trigger specifics
      if (manifest.registration.triggerType === 'log') {
        if (manifest.registration.logEmitterAddress && /^0x[a-fA-F0-9]{40}$/.test(manifest.registration.logEmitterAddress)) {
          console.log(`   ✅ Log emitter address format is valid`);
        } else {
          console.log(`   ❌ Invalid log emitter address format`);
        }
        
        if (manifest.registration.logEventSignature && manifest.registration.logEventSignature.includes('(')) {
          console.log(`   ✅ Log event signature format looks valid`);
        } else {
          console.log(`   ⚠️  Log event signature should include parameter types: EventName(type1,type2)`);
        }
      }

      console.log(`\n🎉 Validation completed successfully!`);

    } catch (error: unknown) {
      console.log(`❌ Manifest validation failed:`);
      
      const zodError = error as { errors?: Array<{ path: Array<string | number>; message: string }> };
      if (zodError.errors) {
        // Zod validation errors
        for (const err of zodError.errors) {
          console.log(`   ${err.path.join('.')}: ${err.message}`);
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`   ${message}`);
      }
      
      console.log(`\n💡 Fix the issues above and run validation again.`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error validating manifest: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function handleUtilVersion(): Promise<void> {
  console.log(`📦 Cartesi Chainlink CLI`);
  console.log(`   Version: 1.0.0`);
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform} ${process.arch}`);
  
  // Check for local simulator
  try {
    const response = await fetch('http://localhost:7788/status', { 
      signal: AbortSignal.timeout(2000) 
    });
    if (response.ok) {
      console.log(`   Local Simulator: ✅ Running on port 7788`);
    } else {
      console.log(`   Local Simulator: ❌ Not responding`);
    }
  } catch {
    console.log(`   Local Simulator: ❌ Not running`);
  }
  
  console.log(`\n🔗 Useful Commands:`);
  console.log(`   cartesi-chainlink dev start      # Start local simulator`);
  console.log(`   cartesi-chainlink network list   # Show supported networks`);
  console.log(`   cartesi-chainlink util init      # Create manifest template`);
  console.log(`   cartesi-chainlink upkeep apply   # Deploy and register upkeep`);
}

export function utilCommands(yargs: Argv): Argv {
  return yargs.command(
    'util <command>',
    'Utility commands',
    (yargs) => {
      return yargs
        .command(
          'init',
          'Generate a manifest template',
          (yargs) => {
            return yargs
              .option('type', {
                alias: 't',
                describe: 'Upkeep trigger type',
                choices: ['log', 'custom'] as const,
                default: 'custom'
              })
              .option('network', {
                alias: 'n',
                describe: 'Target network',
                type: 'string',
                default: 'local'
              })
              .option('output', {
                alias: 'o',
                describe: 'Output filename',
                type: 'string'
              });
          },
          async (args) => {
            await handleUtilInit(args as UtilInitArgs);
          }
        )
        .command(
          'validate <file>',
          'Validate a manifest file',
          (yargs) => {
            return yargs.positional('file', {
              describe: 'Path to manifest file to validate',
              type: 'string',
              demandOption: true
            });
          },
          async (args) => {
            await handleUtilValidate(args as UtilValidateArgs);
          }
        )
        .command(
          'version',
          'Show CLI version and status',
          () => {},
          async () => {
            await handleUtilVersion();
          }
        )
        .demandCommand(1, 'Please specify a utility command')
        .help();
    },
    () => {
      console.log('Please specify a utility command. Use --help for available commands.');
    }
  );
} 