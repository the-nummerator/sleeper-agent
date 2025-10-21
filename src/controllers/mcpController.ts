import { Request, Response, NextFunction } from 'express';
import { SleeperMCPServer } from '../MCP/Sleeper/sleeper_mcp';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class MCPController {
  private mcpServer: SleeperMCPServer;
  private isInitialized: boolean = false;

  constructor() {
    this.mcpServer = new SleeperMCPServer();
  }

  /**
   * Initialize the MCP server 
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      try {
        console.log('Initializing MCP server...');
        
        // Initialize the underlying MCP server
        await this.mcpServer.initializeServer();
        
        this.isInitialized = true;
        console.log('MCP server initialized successfully');
      } catch (error) {
        console.error('Failed to initialize MCP server:', error);
        throw error;
      }
    }
  }

  /**
   * Handle SSE endpoint for MCP communication
   */
  async handleSSE(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure MCP server is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Create SSE transport and connect
      const transport = new SSEServerTransport("/mcp/messages", res);
      await this.mcpServer.getServer().connect(transport);
      
      // Handle client disconnect
      req.on("close", () => {
        this.mcpServer.getServer().close();
      });
    } catch (error) {
      console.error('SSE connection error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal SSE server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Handle POST messages for MCP communication
   * This is where the actual MCP requests are processed
   */
  async handleMessages(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure MCP server is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // For now, we'll process the MCP request directly
      // In a full SSE implementation, this would queue messages to active SSE connections
      const mcpRequest = req.body;
      
      // For testing purposes, let's handle tools/list directly
      if (mcpRequest.method === 'tools/list') {
        // Get the tools from the server
        const tools = await this.mcpServer.getAvailableTools();
        res.json({
          jsonrpc: "2.0",
          result: { tools },
          id: mcpRequest.id
        });
        return;
      }

      res.status(200).json({
        jsonrpc: "2.0",
        result: { status: "Message received" },
        id: mcpRequest.id
      });
    } catch (error) {
      console.error('MCP message error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal MCP message error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Health check for MCP server
   */
  async healthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          mcpServer: this.isInitialized ? 'initialized' : 'not initialized',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get MCP server status and capabilities
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // You could add more detailed status information here
      res.json({
        success: true,
        data: {
          status: 'running',
          initialized: this.isInitialized,
          transport: 'http',
          capabilities: [
            'tools/list',
            'tools/call', 
            'prompts/list',
            'prompts/get',
            'resources/list',
            'resources/read'
          ]
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the MCP server instance (for internal use)
   */
  getServer(): SleeperMCPServer {
    return this.mcpServer;
  }
}