import express from 'express';
import { UpkeepRegistry } from './registry';

const PORT = process.env.PORT || 7788;

interface SimulatorConfig {
    rpcUrl: string;
    privateKey: string;
}

export function startSimulatorServer(config: SimulatorConfig) {
    const app = express();
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
        try {
            const upkeepOptions = req.body;
            registry.registerUpkeep(upkeepOptions);
            console.log(`[Server] Registered new upkeep: ${upkeepOptions.name}`);
            res.status(201).json({ message: 'Upkeep registered successfully.' });
        } catch (error: any) {
            console.error('[Server] Failed to register upkeep:', error);
            res.status(400).json({ error: error.message });
        }
    });

    // API endpoint to unregister an upkeep (e.g., during test cleanup)
    app.post('/unregister', (req, res) => {
        try {
            const { upkeepContract } = req.body;
            if (!upkeepContract) {
                throw new Error('upkeepContract address is required.');
            }
            registry.unregisterUpkeep(upkeepContract);
            console.log(`[Server] Unregistered upkeep: ${upkeepContract}`);
            res.status(200).json({ message: 'Upkeep unregistered successfully.' });
        } catch (error: any) {
            console.error('[Server] Failed to unregister upkeep:', error);
            res.status(400).json({ error: error.message });
        }
    });

    app.listen(PORT, () => {
        console.log(`🚀 Local Chainlink Simulator server running on http://localhost:${PORT}`);
    });

    return app;
}
