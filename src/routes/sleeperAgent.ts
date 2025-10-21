import { Router } from 'express';
import { SleeperAgentController } from '../controllers/sleeperAgentController';

const router = Router();
const controller = new SleeperAgentController();

// AI query processing
router.post('/query', controller.processQuery.bind(controller));

// MCP prompts management
router.get('/prompts', controller.listPrompts.bind(controller));
router.post('/prompts/invoke', controller.invokePrompt.bind(controller));

// MCP tools listing
router.get('/tools', controller.listTools.bind(controller));

export default router;