import { ethers } from 'ethers';
import fs from 'fs';

/** Common ABI alias */
type Abi = ethers.ContractInterface;

/** Artifact shapes supported */
interface FoundryLikeBytecode {
  object?: string;
  bytecode?: string; // seen in some toolchains
}
interface EvmBytecode {
  object?: string;
}
interface EvmSection {
  bytecode?: EvmBytecode;
}
interface OutputSection {
  abi?: Abi;
}

interface ContractArtifact {
  abi?: Abi;                 // Hardhat / Foundry
  bytecode?: string | FoundryLikeBytecode; // Hardhat (string) or Foundry-like ({ object })
  evm?: EvmSection;          // raw solc / variants
  output?: OutputSection;    // some tools put ABI here
}

export interface DeploymentOptions {
  wallet: ethers.Wallet;
  artifactPath?: string;
  template?: string; // reserved for future
  constructorArgs?: unknown[];
}

/* ------------------------- type guards / helpers ------------------------- */

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function hasObjectString(v: unknown): v is { object: string } {
  if (typeof v !== 'object' || v === null) return false;
  const maybe = v as { object?: unknown };
  return isString(maybe.object);
}

/** Extract ABI + bytecode from various artifact shapes, fully typed. */
function normalizeArtifact(artifact: ContractArtifact): { abi: Abi; bytecode: string } {
  // Resolve ABI
  const abi =
    artifact.abi ??
    artifact.output?.abi ??
    (() => {
      throw new Error("Invalid artifact: missing ABI (expected 'abi' or 'output.abi').");
    })();

  // Resolve bytecode
  let bytecode: string | undefined;

  // 1) Hardhat: artifact.bytecode is a hex string
  if (isString(artifact.bytecode)) {
    bytecode = artifact.bytecode;
  }

  // 2) Foundry-like: artifact.bytecode.object is the hex string
  if (!bytecode && artifact.bytecode && hasObjectString(artifact.bytecode)) {
    bytecode = artifact.bytecode.object;
  }

  // 3) Raw solc: evm.bytecode.object
  if (!bytecode && artifact.evm?.bytecode?.object && isString(artifact.evm.bytecode.object)) {
    bytecode = artifact.evm.bytecode.object;
  }

  if (!bytecode) {
    throw new Error(
      "Invalid artifact: missing bytecode. Expected 'bytecode' (string), 'bytecode.object' (string), or 'evm.bytecode.object' (string)."
    );
  }

  // Normalize prefix
  if (!bytecode.startsWith('0x')) {
    bytecode = `0x${bytecode}`;
  }

  if (bytecode === '0x' || bytecode === '0x0') {
    throw new Error('Invalid artifact: bytecode is empty.');
  }

  return { abi, bytecode };
}

/* -------------------------------- deployer -------------------------------- */

export async function deployUpkeep(options: DeploymentOptions): Promise<string> {
  const { wallet, artifactPath, template, constructorArgs = [] } = options;

  if (template) {
    throw new Error('Template loader not implemented');
  }
  if (!artifactPath) {
    throw new Error("Either 'artifactPath' or 'template' must be provided");
  }

  console.log(`📦 Loading contract artifact from: ${artifactPath}`);

  let artifact: ContractArtifact;
  try {
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    artifact = JSON.parse(artifactContent) as ContractArtifact;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read artifact file: ${msg}`);
  }

  const { abi, bytecode } = normalizeArtifact(artifact);

  console.log('🔨 Creating contract factory...');
  let factory: ethers.ContractFactory;
  try {
    factory = new ethers.ContractFactory(abi, bytecode, wallet);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create contract factory: ${msg}`);
  }

  console.log(`🚀 Deploying contract with args: [${constructorArgs.map((a) => JSON.stringify(a)).join(', ')}]`);

  // `deploy` is typed as (...args: any[]) — to avoid `any`, cast a local callable type once.
  type DeployFn = (...args: unknown[]) => Promise<ethers.Contract>;
  const deployFn: DeployFn = factory.deploy.bind(factory) as unknown as DeployFn;

  let contract: ethers.Contract;
  try {
    contract = await deployFn(...constructorArgs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to deploy contract: ${msg}`);
  }

  console.log('⏳ Waiting for deployment transaction to be mined...');
  try {
    await contract.deployed();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to wait for deployment: ${msg}`);
  }

  const address = contract.address;
  console.log(`✅ Contract deployed successfully at: ${address}`);
  return address;
}

export function validateArtifactPath(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Artifact file not found: ${filePath}`);
  }
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    throw new Error(`Artifact file is not readable: ${filePath}`);
  }
}
