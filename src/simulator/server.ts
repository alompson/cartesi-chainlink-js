import express from 'express';
import { UpkeepRegistry } from './registry';
import { CreateUpkeepOptions } from '../interfaces';

interface SimulatorConfig {
    rpcUrl: string;
    privateKey: string;
}

function validateRegisterBody(body: unknown): { ok: true } | { ok: false; errors: string[] } {
    const errors: string[] = [];

    if (!body || typeof body !== 'object') {
        return { ok: false, errors: ['Invalid JSON body'] };
    }
    const b = body as Record<string, unknown>;

    // Required for all
    if (typeof b.name !== 'string' || b.name.trim() === '') errors.push('name is required (string)');
    if (typeof b.upkeepContract !== 'string' || b.upkeepContract.trim() === '') errors.push('upkeepContract is required (string address)');
    if (b.triggerType !== 'log' && b.triggerType !== 'custom') errors.push("triggerType must be 'log' or 'custom'");
    if (typeof b.gasLimit !== 'number' || b.gasLimit <= 0) errors.push('gasLimit is required (positive number)');

    // Extra requirements for log-triggered upkeeps
    if (b.triggerType === 'log') {
        if (typeof b.logEmitterAddress !== 'string' || b.logEmitterAddress.trim() === '') errors.push('logEmitterAddress is required (string address) for triggerType=log');
        if (typeof b.logEventSignature !== 'string' || b.logEventSignature.trim() === '') errors.push('logEventSignature is required (string) for triggerType=log');
    }

    return errors.length ? { ok: false, errors } : { ok: true };
}

export function startSimulatorServer(config: SimulatorConfig) {
    const app = express();
    const port = 7788;
    app.use(express.json());

    // Initialize the registry that will manage our upkeep jobs
    const registry = new UpkeepRegistry(config);

    // API endpoint to check the health of the simulator
    app.get('/status', (req, res) => {
        res.status(200).json({ 
            status: 'ok',
            registeredUpkeeps: registry.getRegisteredUpkeepsCount() 
        });
    });

    // API endpoint for a client (e.g., a test script) to register a new upkeep
    app.post('/register', (req, res) => {
        const validation = validateRegisterBody(req.body);
        if (!validation.ok) {
            return res.status(400).json({ message: 'Invalid register payload', errors: validation.errors });
        }
        try {
            const options = req.body as CreateUpkeepOptions;
            registry.registerUpkeep(options);
            res.status(200).send({ message: 'Upkeep registered successfully' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Server] Failed to register upkeep:', errorMessage);
            res.status(500).send({ message: `Failed to register upkeep: ${errorMessage}` });
        }
    });

    // API endpoint to unregister an upkeep (e.g., during test cleanup)
    app.post('/unregister', (req, res) => {
        try {
            const { upkeepContract } = req.body as { upkeepContract?: string };
            if (typeof upkeepContract !== 'string' || upkeepContract.trim() === '') {
                return res.status(400).json({ message: 'Invalid unregister payload', errors: ['upkeepContract is required (string address)'] });
            }
            registry.unregisterUpkeep(upkeepContract);
            res.status(200).send({ message: 'Upkeep unregistered successfully' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Server] Failed to unregister upkeep:', errorMessage);
            res.status(500).send({ message: `Failed to unregister upkeep: ${errorMessage}` });
        }
    });

    app.listen(port, () => {
        console.log(`🚀 Local Chainlink Simulator server running on http://localhost:${port}`);
    });

    return app;
}
