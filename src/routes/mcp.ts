import { Router } from 'express';
import { MCPController } from '../controllers/mcpController';

const router = Router();
const mcpController = new MCPController();

// Initialize MCP server on first load
mcpController.initialize().catch(console.error);

// SSE endpoint for MCP communication
router.get('/sse', mcpController.handleSSE.bind(mcpController));

// POST endpoint for client messages
router.post('/messages', mcpController.handleMessages.bind(mcpController));

// Health check endpoint
router.get('/health', mcpController.healthCheck.bind(mcpController));

// Status endpoint
router.get('/status', mcpController.getStatus.bind(mcpController));

export default router;