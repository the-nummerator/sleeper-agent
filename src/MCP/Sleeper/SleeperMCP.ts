/**
 * Sleeper Fantasy Football MCP Server
 * 
 * This MCP server provides tools for accessing Sleeper Fantasy Football data
 * through the Model Context Protocol. It implements league operations and
 * avatar retrieval functionality.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";

// ============================================================================
// CUSTOM IMPORTS
// ============================================================================

// If you update tsconfig.json, use:
// import sleeper_mcp_json_def from "./sleeper_mcp.json" assert { type: "json" };

// Otherwise, use standard import:
import sleeper_mcp_json_def from "./sleeper_tools_def.json";

// Import all interfaces from ../types.ts
import type {
  MCPServer,
  MCPCapabilities,
  MCPTool,
  MCPResource,
  MCPResourceContent,
  MCPResult
} from "../types";


// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = "https://api.sleeper.app/v1";
const CDN_BASE_URL = "https://sleepercdn.com";
const RATE_LIMIT_DELAY = 120; // Delay between requests in ms to stay under rate limit

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SleeperApiConfig {
  apiBaseUrl: string;
  cdnBaseUrl: string;
  rateLimitDelay: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// League tool schemas
const GetLeagueSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

const GetLeagueRostersSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

const GetLeagueUsersSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

const GetLeagueMatchupsSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  week: z.number().min(1).max(18).describe("Week number (1-18)"),
});

const GetPlayoffBracketSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  bracket_type: z.enum(["winners", "losers"]).describe("Type of playoff bracket"),
});

const GetTransactionsSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
  round: z.number().min(1).describe("Round/week number"),
});

const GetTradedPicksSchema = z.object({
  league_id: z.string().describe("The unique league identifier"),
});

// Avatar tool schemas
const GetAvatarSchema = z.object({
  avatar_id: z.string().describe("Avatar identifier"),
  size: z.enum(["full", "thumb"]).describe("Avatar size - full or thumbnail"),
});

// ============================================================================
// MCP SERVER CLASS
// ============================================================================

class SleeperMCPServer {
  private server: Server;
  private config: SleeperApiConfig;
  private lastRequestTime: number = 0;

  constructor(config?: Partial<SleeperApiConfig>) {
    this.config = {
      apiBaseUrl: config?.apiBaseUrl || API_BASE_URL,
      cdnBaseUrl: config?.cdnBaseUrl || CDN_BASE_URL,
      rateLimitDelay: config?.rateLimitDelay || RATE_LIMIT_DELAY,
    };

    this.server = new Server(
      {
        name: "sleeper-fantasy-football",
        version: "0.01",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Apply rate limiting to prevent hitting API limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.config.rateLimitDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make a request to the Sleeper API
   */
  private async makeApiRequest(endpoint: string): Promise<any> {
    await this.enforceRateLimit();
    
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch from Sleeper API: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get avatar URL
   */
  private getAvatarUrl(avatarId: string, size: "full" | "thumb"): string {
    const path = size === "thumb" ? `/avatars/thumbs/${avatarId}` : `/avatars/${avatarId}`;
    return `${this.config.cdnBaseUrl}${path}`;
  }

  /**
   * Format response for MCP
   */
  private formatResponse(data: any, description?: string): Object {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => 
      sleeper_mcp_json_def
    );

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // League Tools
          case "get_league": {
            const params = GetLeagueSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}`);
            return this.formatResponse(data);
          }

          case "get_league_rosters": {
            const params = GetLeagueRostersSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}/rosters`);
            return this.formatResponse(data);
          }

          case "get_league_users": {
            const params = GetLeagueUsersSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}/users`);
            return this.formatResponse(data);
          }

          case "get_league_matchups": {
            const params = GetLeagueMatchupsSchema.parse(args);
            const data = await this.makeApiRequest(
              `/league/${params.league_id}/matchups/${params.week}`
            );
            return this.formatResponse(data);
          }

          case "get_playoff_bracket": {
            const params = GetPlayoffBracketSchema.parse(args);
            const endpoint = params.bracket_type === "winners" 
              ? `/league/${params.league_id}/winners_bracket`
              : `/league/${params.league_id}/losers_bracket`;
            const data = await this.makeApiRequest(endpoint);
            return this.formatResponse(data);
          }

          case "get_transactions": {
            const params = GetTransactionsSchema.parse(args);
            const data = await this.makeApiRequest(
              `/league/${params.league_id}/transactions/${params.round}`
            );
            return this.formatResponse(data);
          }

          case "get_traded_picks": {
            const params = GetTradedPicksSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}/traded_picks`);
            return this.formatResponse(data);
          }

          // Avatar Tools
          case "get_avatar": {
            const params = GetAvatarSchema.parse(args);
            const url = this.getAvatarUrl(params.avatar_id, params.size);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    avatar_url: url,
                    avatar_id: params.avatar_id,
                    size: params.size,
                    message: "Use this URL to display the avatar image",
                  }, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Sleeper MCP server started successfully");
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  try {
    const server = new SleeperMCPServer();
    await server.start();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Run the server if this is the main module
if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SleeperMCPServer, SleeperApiConfig as SleeperApiConfig };

// ============================================================================
// PACKAGE.JSON CONFIGURATION
// ============================================================================

/*
{
  "name": "sleeper-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Sleeper Fantasy Football API",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "node-fetch": "^3.3.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/node-fetch": "^2.6.9",
    "jest": "^29.7.0",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  },
  "keywords": [
    "mcp",
    "sleeper",
    "fantasy-football",
    "api"
  ],
  "author": "",
  "license": "MIT"
}
*/

// ============================================================================
// MCP CONFIGURATION FILE (mcp.json)
// ============================================================================

/*
{
  "mcpServers": {
    "sleeper": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {}
    }
  }
}
*/

// ============================================================================
// USAGE DOCUMENTATION
// ============================================================================

/*
# Sleeper Fantasy Football MCP Server

## Installation

```bash
npm install
npm run build
```

## Running the Server

```bash
npm start
```

## Available Tools

### League Tools

1. **get_league** - Get detailed league information
   - Parameters: league_id (string)
   - Returns: Complete league object with settings, scoring, and rosters

2. **get_league_rosters** - Get all rosters in a league
   - Parameters: league_id (string)
   - Returns: Array of roster objects with players and settings

3. **get_league_users** - Get all users in a league with metadata
   - Parameters: league_id (string)
   - Returns: Array of users with team names and commissioner status

4. **get_league_matchups** - Get matchups for a specific week
   - Parameters: league_id (string), week (number 1-18)
   - Returns: Array of matchup objects with scores and player lists

5. **get_playoff_bracket** - Get playoff bracket
   - Parameters: league_id (string), bracket_type ("winners" or "losers")
   - Returns: Playoff bracket structure with matchups and progression

6. **get_transactions** - Get transactions for a round/week
   - Parameters: league_id (string), round (number)
   - Returns: Array of transactions including trades, waivers, and free agents

7. **get_traded_picks** - Get all traded draft picks
   - Parameters: league_id (string)
   - Returns: Array of traded pick objects with ownership details

### Avatar Tools

8. **get_avatar** - Get avatar image URL
   - Parameters: avatar_id (string), size ("full" or "thumb")
   - Returns: Avatar URL for embedding or display

## Integration with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "sleeper": {
      "command": "node",
      "args": ["/path/to/sleeper-mcp-server/dist/index.js"]
    }
  }
}
```

## Rate Limiting

The server automatically implements rate limiting to stay under Sleeper's 
1000 requests per minute limit. Each request has a minimum 100ms delay.

## Error Handling

The server provides comprehensive error handling with proper MCP error codes:
- Invalid parameters return InvalidParams errors
- API failures return InternalError with details
- Unknown tools return MethodNotFound errors

## Example Usage in AI Assistant

"Get the current rosters for league 289646328504385536"
"Show me week 5 matchups for my league"
"Get the playoff bracket for league 289646328504385536"
"Find all trades in week 3"
*/