import fs from 'fs';
import path from 'path';
import { GenerateContractOptions } from './interfaces';

/**
 * @private
 * Reads a template file and injects the provided logic.
 * @param templateName The name of the template file (e.g., 'CustomLogic.sol.template').
 * @param replacements An object where keys are placeholders and values are the code to inject.
 * @returns The final Solidity code as a string.
 */
function buildFromTemplate(templateName: string, replacements: Record<string, string>): string {
    const templatePath = path.join(__dirname, '..', 'templates', templateName);
    let templateContent = fs.readFileSync(templatePath, 'utf8');

    for (const placeholder in replacements) {
        const regex = new RegExp(`{{${placeholder}}}`, 'g');
        templateContent = templateContent.replace(regex, replacements[placeholder]);
    }

    return templateContent;
}


/**
 * @notice Generates the source code for a Chainlink Automation compatible contract.
 * @param options The configuration specifying the trigger type and logic.
 * @returns An object containing the generated Solidity source code.
 */
export function generateCompatibleContract(options: GenerateContractOptions): { solidityCode: string } {
    let solidityCode: string;

    switch (options.triggerType) {
        case 'custom':
            solidityCode = buildFromTemplate('CustomLogic.sol.template', {
                checkLogic: options.checkLogic,
                performLogic: options.performLogic,
            });
            break;

        case 'log':
            // Assume a 'Log.sol.template' exists for this case
            solidityCode = buildFromTemplate('Log.sol.template', {
                performLogic: options.performLogic,
            });
            break;
            
        default:
            throw new Error("Unsupported trigger type for contract generation.");
    }

    return { solidityCode };
}