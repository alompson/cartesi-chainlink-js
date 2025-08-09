import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import { Automation } from '../automation.js';
import { CreateUpkeepOptions } from '../interfaces.js';
import { ManifestSchema, type Manifest, type State } from '../manifest/schema.js';
import { deployUpkeep, validateArtifactPath } from '../manifest/deployer.js';

/**
 * Applies a manifest file, handling deployment and registration
 * 
 * @param filePath - Path to the manifest JSON file
 * @param wallet - Ethereum wallet for transactions
 * @throws Error if manifest is invalid or operations fail
 */
export async function applyManifest(filePath: string, wallet: ethers.Wallet): Promise<void> {
  console.log(`📋 Loading manifest from: ${filePath}`);
  
  // Validate manifest file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Manifest file not found: ${filePath}`);
  }

  // Read and parse manifest
  let rawManifest: unknown;
  try {
    const manifestContent = fs.readFileSync(filePath, 'utf8');
    rawManifest = parse(manifestContent);
  } catch (error) {
    throw new Error(`Failed to parse manifest file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate manifest against schema
  let manifest: Manifest;
  try {
    manifest = ManifestSchema.parse(rawManifest);
  } catch (error: unknown) {
    const zodError = error as { errors?: Array<{ path: Array<string | number>; message: string }> };
    const errorMessage = zodError.errors 
      ? zodError.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
      : error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid manifest: ${errorMessage}`);
  }

  console.log(`✅ Manifest validated successfully`);
  console.log(`🌐 Network: ${manifest.network.mode} (chainId: ${manifest.network.chainId})`);
  console.log(`📝 Registration: ${manifest.registration.name} (${manifest.registration.triggerType})`);

  // Initialize Automation instance
  const automation = new Automation({
    signer: wallet,
    chainId: manifest.network.chainId,
    mode: manifest.network.mode
  });

  let upkeepContract = manifest.registration.upkeepContract;
  let deployedAddress: string | undefined;

  // Handle deployment if needed
  if (upkeepContract === 'auto') {
    if (!manifest.deployment) {
      throw new Error("Deployment configuration is required when upkeepContract is 'auto'");
    }

    console.log(`🔧 Auto-deployment requested...`);

    // Validate artifact path if provided
    if (manifest.deployment.artifact) {
      // Resolve artifact path relative to manifest file
      const manifestDir = path.dirname(filePath);
      const absoluteArtifactPath = path.resolve(manifestDir, manifest.deployment.artifact);
      validateArtifactPath(absoluteArtifactPath);

      // Deploy contract
      deployedAddress = await deployUpkeep({
        wallet,
        artifactPath: absoluteArtifactPath,
        constructorArgs: manifest.deployment.constructorArgs || []
      });

      upkeepContract = deployedAddress;
      console.log(`🎯 Using deployed contract address: ${deployedAddress}`);
    } else if (manifest.deployment.template) {
      // Deploy from template (stubbed for future)
      deployedAddress = await deployUpkeep({
        wallet,
        template: manifest.deployment.template,
        constructorArgs: manifest.deployment.constructorArgs || []
      });

      upkeepContract = deployedAddress;
    }
  }

  // Build CreateUpkeepOptions
  let upkeepOptions: CreateUpkeepOptions;
  
  if (manifest.registration.triggerType === 'log') {
    upkeepOptions = {
      name: manifest.registration.name,
      upkeepContract: upkeepContract as string,
      gasLimit: manifest.registration.gasLimit,
      triggerType: 'log',
      initialFunds: manifest.network.mode === 'chainlink' 
        ? manifest.registration.initialFunds! 
        : '0',
      logEmitterAddress: manifest.registration.logEmitterAddress!,
      logEventSignature: manifest.registration.logEventSignature!,
      ...(manifest.registration.logTopicFilters && {
        logTopicFilters: manifest.registration.logTopicFilters
      })
    };
  } else {
    upkeepOptions = {
      name: manifest.registration.name,
      upkeepContract: upkeepContract as string,
      gasLimit: manifest.registration.gasLimit,
      triggerType: 'custom',
      initialFunds: manifest.network.mode === 'chainlink' 
        ? manifest.registration.initialFunds! 
        : '0'
    };
  }

  // Register the upkeep
  console.log(`📝 Registering upkeep...`);
  let upkeepId: string;
  try {
    const result = await automation.createUpkeep(upkeepOptions);
    upkeepId = result.upkeepId;
  } catch (error) {
    throw new Error(`Failed to register upkeep: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`🎉 Upkeep registered successfully!`);
  console.log(`📊 Upkeep ID: ${upkeepId}`);
  console.log(`📍 Contract: ${upkeepContract}`);

  // Write state file
  const stateFilePath = filePath.replace(/\.jsonc?$/, '.state.json');
  const state: State = {
    address: upkeepContract as string,
    upkeepId,
    network: manifest.network,
    name: manifest.registration.name,
    timestamp: new Date().toISOString()
  };

  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
    console.log(`💾 State saved to: ${stateFilePath}`);
  } catch (error) {
    console.warn(`⚠️  Failed to write state file: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`\n✨ Manifest applied successfully!`);
  
  // Display summary
  console.log(`\n📋 Summary:`);
  console.log(`   Name: ${manifest.registration.name}`);
  console.log(`   Type: ${manifest.registration.triggerType}`);
  console.log(`   Contract: ${upkeepContract}`);
  console.log(`   Upkeep ID: ${upkeepId}`);
  console.log(`   Network: ${manifest.network.mode} (${manifest.network.chainId})`);
  if (deployedAddress) {
    console.log(`   Deployed: Yes (${deployedAddress})`);
  }
} 