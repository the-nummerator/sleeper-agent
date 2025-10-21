import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes/api';
import sleeperAgentRoutes from './routes/sleeperAgent';
import mcpRoutes from './routes/mcp';

import { SleeperMCPServer } from './MCP/Sleeper/sleeper_mcp';
import { isMcpStartedByClaude as claudeDesktopSpawnChecker } from './MCP';


process.title = 'sleeper-agent';

// Load environment variables from vars.env in the root directory
const varsEnvPath = path.join(process.cwd(), 'vars.env');
console.log('Looking for vars.env at:', varsEnvPath);
console.log('vars.env exists:', fs.existsSync(varsEnvPath));

if (fs.existsSync(varsEnvPath)) {
  const result = dotenv.config({ path: varsEnvPath });
  if (result.error) {
    console.error('Error loading vars.env:', result.error);
  } else {
    console.log('Successfully loaded vars.env');
    console.log('Loaded variables:', Object.keys(result.parsed || {}));
  }
} else {
  console.log('vars.env not found, trying default .env');
  dotenv.config(); // Fallback to default .env
}

// Start the application

startHttpApplication().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});



/*******
Initialize and Start Application
********/

async function startHttpApplication(): Promise<express.Express | void> {

  if (await claudeDesktopSpawnChecker()) {

    console.error('MCP is started by Claude');
    try {
      const server = new SleeperMCPServer();
      server.startStdio();
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
      }
  } else {

    console.log('MCP is not started by Claude, starting the proper server');

    /*******
    Start the Router
    ********/

    const app = express();
    const ROUTER_PORT = process.env.ROUTER_PORT || 3000;

    app.use(helmet());
    app.use(cors());
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    app.use('/api', apiRoutes);
    app.use('/agent', sleeperAgentRoutes);
    app.use('/mcp', mcpRoutes);

    app.use(notFound);
    app.use(errorHandler);

    /******
     * start the server
     ******/

    const expressServer = app.listen(ROUTER_PORT, () => {
      console.log(`🚀 Server running on port ${ROUTER_PORT}`);
      console.log(`📊 Health check: http://localhost:${ROUTER_PORT}/health`);
      console.log(`🔌 MCP endpoint: http://localhost:${ROUTER_PORT}/mcp`);
      console.log(`🔧 MCP status: http://localhost:${ROUTER_PORT}/mcp/status`);
      console.log(`🤖 SleeperAgent endpoints: http://localhost:${ROUTER_PORT}/agent`);
    }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${ROUTER_PORT} is busy`);
        } else {
            console.error('Server error:', err);
        }
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      expressServer.close(() => {
        console.log('Process terminated');
      });
    });

    // Add error handling for EPIPE errors
    process.on('uncaughtException', (err) => {
      if ((err as any).code === 'EPIPE') {
        console.error('Client disconnected, ignoring EPIPE error');
        return;
      }
      throw err; // Re-throw other errors
    });

    return app;
    }

}


