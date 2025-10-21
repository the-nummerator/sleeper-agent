import { Request, Response, NextFunction } from 'express';
import { SleeperAgent } from '../Agents/SleeperAgent';
import fetch from 'node-fetch';


/* 
  General Query:

  POST /agent/query
  {
    "query": "Analyze the weekly matchups for week 8",
    "context": { "useMCPTools": true }
  }

  List Prompts:

  GET /agent/prompts

  Invoke MCP Prompt:

  POST /agent/prompts/invoke
  {
    "promptName": "weekly_summary",
    "arguments": {}
  }
*/  

export class SleeperAgentController {
  private agent: SleeperAgent | null = null;
  private mcpBaseUrl: string;

  constructor() {
    // MCP server running on the main Express server port at /mcp/messages endpoint
    const port = process.env.ROUTER_PORT || 3000;
    this.mcpBaseUrl = `http://localhost:${port}/mcp/messages`;
  }

  private getAgent(): SleeperAgent {
    if (!this.agent) {
      this.agent = new SleeperAgent();
    }
    return this.agent;
  }

  /**
   * Process a general AI query using SleeperAgent
   */
  async processQuery(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, context } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }

      console.log('Sleeper Agent ControllerReceived query:', query);

      // Run the agent with the query
      const response = await this.getAgent().run(query, context || {});

      res.json({
        success: true,
        data: {
          response,
          queryType: context?.queryType || 'general'
        }
      });
    } catch (error) {
      next(error);
    }

    return null;
  }

  /**
   * List all available MCP prompts
   */
  async listPrompts(req: Request, res: Response, next: NextFunction) {
    try {
      // Call MCP server to get prompts list
      const mcpRequest = {
        jsonrpc: "2.0",
        method: "prompts/list",
        params: {},
        id: Date.now()
      };

      const response = await fetch(this.mcpBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(mcpRequest)
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      console.log('Sleeper Agent MCP Prompts List:', data.result);

      res.json({
        success: true,
        data: data.result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invoke a specific MCP prompt via SleeperAgent
   */
  async invokePrompt(req: Request, res: Response, next: NextFunction) {
    try {
      const { promptName, arguments: promptArgs = {} } = req.body;

      if (!promptName) {
        return res.status(400).json({
          success: false,
          error: 'Prompt name is required'
        });
      }

      // First, get the prompt from MCP
      const mcpRequest = {
        jsonrpc: "2.0",
        method: "prompts/get",
        params: {
          name: promptName,
          arguments: promptArgs
        },
        id: Date.now()
      };

      const mcpResponse = await fetch(this.mcpBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(mcpRequest)
      });

      const mcpData = await mcpResponse.json();

      console.log('Invoke Prompt MCP Prompt Fetch Response:', mcpData);

      if (mcpData.error) {
        throw new Error(mcpData.error.message);
      }

      // Extract the prompt content from MCP response
      const promptContent = mcpData.result?.prompt || '';

      // Create context that includes MCP tools availability
      const context = {
        ...promptArgs,
        mcpPromptName: promptName,
        mcpToolsAvailable: true,
        requestType: 'mcp_prompt_execution'
      };

      // Run the agent with the prompt
      const response = await this.getAgent().run(promptContent, context);

      res.json({
        success: true,
        data: {
          promptName,
          response,
          context
        }
      });
    } catch (error) {
      next(error);
    }

    return null;
  }

  /**
   * List all available MCP tools
   */
  async listTools(req: Request, res: Response, next: NextFunction) {
    try {
      // Call MCP server to get tools list
      const mcpRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: Date.now()
      };

      const response = await fetch(this.mcpBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(mcpRequest)
      });

      const data = await response.json();

      console.log('Sleeper Agent MCP Tools List:', data);

      if (data.error) {
        throw new Error(data.error.message);
      }

      res.json({
        success: true,
        data: data.result
      });
    } catch (error) {
      next(error);
    }
  }
}