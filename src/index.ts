import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes/api';

import { SleeperMCPServer } from './MCP/Sleeper/SleeperMCP';

dotenv.config();

/*******
Start the Route
********/

/*  Temporary removal to enable Claude to connet to my local MCP servers

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

const server = app.listen(ROUTER_PORT, () => {
  console.log(`🚀 Server running on port ${ROUTER_PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
}).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${ROUTER_PORT} is busy`);
    } else {
        console.log('Server error:', err);
    }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;

*/

/*******
Start MCP Server(s)
********/
const SLEEPER_MCP_PORT = process.env.SLEEPER_MCP_PORT || 3001;

try {
    const server = new SleeperMCPServer();
    server.start();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }