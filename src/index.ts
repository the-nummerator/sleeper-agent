import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes/api';

import { SleeperMCPServer } from './MCP/Sleeper/sleeper_mcp';
import { isMcpStartedByClaude } from './MCP';

dotenv.config();

// Start the application

startHttpApplication().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});



/*******
Initialize and Start Application
********/

async function startHttpApplication(): Promise<express.Express | void> {

  if (await isMcpStartedByClaude()) {

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

    app.use(notFound);
    app.use(errorHandler);

    /*******
    Initialize MCP Server
    ********/
    const SLEEPER_MCP_PORT: string = process.env.SLEEPER_MCP_PORT || '3001';

    let mcpServer: SleeperMCPServer;

    try {
      const mcpServer = new SleeperMCPServer();
      await mcpServer.initialize(SLEEPER_MCP_PORT);

      // MCP routes
      app.all('/mcp', async (req, res) => {
      try {
        await mcpServer.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('MCP request error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
    }

    

    /******
     * start the server
     ******/

    const expressServer = app.listen(ROUTER_PORT, () => {
      console.log(`🚀 Server running on port ${ROUTER_PORT}`);
      console.log(`📊 Health check: http://localhost:${ROUTER_PORT}/health`);
      console.log(`🔌 MCP endpoint: http://localhost:${ROUTER_PORT}/mcp`);
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


