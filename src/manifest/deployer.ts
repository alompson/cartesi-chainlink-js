import { ethers } from 'ethers';
import fs from 'fs';

/**
 * Contract artifact structure expected from Hardhat/Foundry compilation
 */
interface ContractArtifact {
  abi: ethers.ContractInterface;
  bytecode?: string;
  evm?: {
    bytecode: {
      object: string;
    };
  };
}

/**
 * Deployment options for contract deployment
 */
export interface DeploymentOptions {
  wallet: ethers.Wallet;
  artifactPath?: string;
  template?: string;
  constructorArgs?: unknown[];
}

/**
 * Deploys a contract based on the provided options
 * 
 * @param options - Deployment configuration
 * @returns Promise<string> - The deployed contract address
 * @throws Error if deployment fails or invalid options provided
 */
export async function deployUpkeep(options: DeploymentOptions): Promise<string> {
  const { wallet, artifactPath, template, constructorArgs = [] } = options;

  // Handle template deployment (future feature)
  if (template) {
    throw new Error("Template loader not implemented");
  }

  // Handle artifact deployment
  if (!artifactPath) {
    throw new Error("Either artifactPath or template must be provided");
  }

  console.log(`📦 Loading contract artifact from: ${artifactPath}`);
  
  // Read and parse the artifact file
  let artifact: ContractArtifact;
  try {
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    artifact = JSON.parse(artifactContent);
  } catch (error) {
    throw new Error(`Failed to read artifact file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate artifact structure
  if (!artifact.abi || !Array.isArray(artifact.abi)) {
    throw new Error("Invalid artifact: missing or invalid 'abi' field");
  }

  // Extract bytecode (support both Hardhat and Foundry formats)
  let bytecode: string;
  if (artifact.bytecode) {
    bytecode = artifact.bytecode;
  } else if (artifact.evm?.bytecode?.object) {
    bytecode = artifact.evm.bytecode.object;
  } else {
    throw new Error("Invalid artifact: missing bytecode. Expected 'bytecode' or 'evm.bytecode.object' field");
  }

  // Ensure bytecode has 0x prefix
  if (!bytecode.startsWith('0x')) {
    bytecode = '0x' + bytecode;
  }

  // Validate bytecode is not empty
  if (bytecode === '0x' || bytecode === '0x0') {
    throw new Error("Invalid artifact: bytecode is empty");
  }

  console.log(`🔨 Creating contract factory...`);
  
  // Create contract factory
  let factory: ethers.ContractFactory;
  try {
    factory = new ethers.ContractFactory(artifact.abi, bytecode, wallet);
  } catch (error) {
    throw new Error(`Failed to create contract factory: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`🚀 Deploying contract with args: [${constructorArgs.map(arg => JSON.stringify(arg)).join(', ')}]`);
  
  // Deploy the contract
  let contract: ethers.Contract;
  try {
    contract = await factory.deploy(...constructorArgs);
  } catch (error) {
    throw new Error(`Failed to deploy contract: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`⏳ Waiting for deployment transaction to be mined...`);
  
  // Wait for deployment to be mined
  try {
    await contract.deployed();
  } catch (error) {
    throw new Error(`Failed to wait for deployment: ${error instanceof Error ? error.message : String(error)}`);
  }

  const address = contract.address;
  console.log(`✅ Contract deployed successfully at: ${address}`);
  
  return address;
}

/**
 * Validates that a file exists and is readable
 * 
 * @param filePath - Path to the file to validate
 * @throws Error if file doesn't exist or isn't readable
 */
export function validateArtifactPath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Artifact file not found: ${filePath}`);
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (_error) {
    throw new Error(`Artifact file is not readable: ${filePath}`);
  }
} 