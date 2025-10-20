/**
 * Sleeper Fantasy Football MCP Server
 * 
 * This MCP server provides tools for accessing Sleeper Fantasy Football data
 * through the Model Context Protocol. It implements league operations and
 * avatar retrieval functionality.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";
import { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

// ============================================================================
// LOCAL IMPORTS
// ============================================================================

import sleeper_mcp_json_def from "./files/sleeper_tools_def.json";
import sleeper_players_json_def from "./files/sleeper_players_def.json";

import {
  GetLeagueSchema,
  GetLeagueRostersSchema,
  GetLeagueUsersSchema,
  GetLeagueMatchupsSchema,
  GetPlayoffBracketSchema,
  GetTransactionsSchema,
  GetTradedPicksSchema,
  GetAvatarSchema,
  GetUserByIdSchema,
  GetUserByUsernameSchema,
  GetPlayersSchema,
  GetTrendingPlayersSchema,
} from "./tool_validation_schemas";
import {
  generatePrompt,
  getAvailablePrompts,
  getPromptDefinition,
} from "./sleeper_prompts";
import {
  getAvailableResources,
  readResource,
  getResourceDefinition,
} from "./sleeper_resources";
import { McpPromptArguments } from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = "https://api.sleeper.app/v1";
const CDN_BASE_URL = "https://sleepercdn.com";
const RATE_LIMIT_DELAY = 120; // Delay between requests in ms to stay under rate limit

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SleeperApiConfig {
  apiBaseUrl: string;
  cdnBaseUrl: string;
  rateLimitDelay: number;
}
// ============================================================================
// MCP SERVER CLASS
// ============================================================================

export class SleeperMCPServer {
  private server: Server;
  private config: SleeperApiConfig;
  private lastRequestTime: number = 0;
  private transport?: StreamableHTTPServerTransport;

  constructor(config?: Partial<SleeperApiConfig>) {
    this.config = {
      apiBaseUrl: config?.apiBaseUrl || API_BASE_URL,
      cdnBaseUrl: config?.cdnBaseUrl || CDN_BASE_URL,
      rateLimitDelay: config?.rateLimitDelay || RATE_LIMIT_DELAY,
    };

    this.server = new Server(
      {
        name: 'sleeper-fantasy-football',
        version: '0.04',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
          logging: {}
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
          case "get_league_id": {
            const data = { league_id: process.env.SLEEPER_LEAGUE_ID?.toString() || '1255621170552655872' };
            return this.formatResponse(data);
          }
          
          case "get_league": {
            const params = GetLeagueSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}`);
            return this.formatResponse(data);
          }

          case "get_league_rosters": {
            const params = GetLeagueRostersSchema.parse(args);
            const data = await this.makeApiRequest(`/league/${params.league_id}/rosters`);
            
            // Helper function to get player name from ID
            const getPlayerName = (playerId: string): string => {
              const player = (sleeper_players_json_def as any)[playerId];
              if (player && player.full_name) {
                return player.full_name;
              }
              // Return the ID if it's a defense/special teams (e.g., "CLE") or unknown player
              return playerId;
            };

            // Transform the roster data to replace player IDs with names
            const transformedData = data.map((roster: any) => {
              const transformed: any = { ...roster };
              
              // Transform players array (player IDs to names)
              if (transformed.players) {
                transformed.players = transformed.players.map((playerId: string) => 
                  getPlayerName(playerId)
                );
              }
              
              // Transform starters array (player IDs to names)
              if (transformed.starters) {
                transformed.starters = transformed.starters.map((playerId: string) => 
                  getPlayerName(playerId)
                );
              }
              
              // Transform keepers array (player IDs to names) if present
              if (transformed.keepers) {
                transformed.keepers = transformed.keepers.map((playerId: string) => 
                  getPlayerName(playerId)
                );
              }
              
              return transformed;
            });
            
            return this.formatResponse(transformedData);
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
            
            // Helper function to get player name from ID
            const getPlayerName = (playerId: string): string => {
              const player = (sleeper_players_json_def as any)[playerId];
              if (player && player.full_name) {
                return player.full_name;
              }
              // Return the ID if it's a defense/special teams (e.g., "CLE") or unknown player
              return playerId;
            };

            // Transform the matchup data to replace player IDs with names
            const transformedData = data.map((matchup: any) => {
              const transformed: any = { ...matchup };
              
              // Keep original starters array for reference
              const originalStarters = transformed.starters ? [...transformed.starters] : [];
              
              // Transform starters array (player IDs to names)
              if (transformed.starters) {
                transformed.starters = transformed.starters.map((playerId: string) => 
                  getPlayerName(playerId)
                );
              }
              
              // Transform players array (player IDs to names)
              if (transformed.players) {
                transformed.players = transformed.players.map((playerId: string) => 
                  getPlayerName(playerId)
                );
              }
              
              // Transform starters_points array (parallel array to starters, map to player names)
              if (transformed.starters_points && originalStarters.length > 0) {
                // Create new array with player names paired with their points
                const startersWithPoints: any = {};
                originalStarters.forEach((playerId: string, index: number) => {
                  const playerName = getPlayerName(playerId);
                  const points = transformed.starters_points[index] || 0;
                  startersWithPoints[playerName] = points;
                });
                transformed.starters_points = startersWithPoints;
              }
              
              // Transform players_points object (player IDs as keys to names)
              if (transformed.players_points) {
                const newPlayersPoints: any = {};
                for (const [playerId, points] of Object.entries(transformed.players_points)) {
                  const playerName = getPlayerName(playerId);
                  newPlayersPoints[playerName] = points;
                }
                transformed.players_points = newPlayersPoints;
              }
              
              return transformed;
            });
            
            return this.formatResponse(transformedData);
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

          // User Tools
          case "get_user_by_id": {
            const params = GetUserByIdSchema.parse(args);
            const data = await this.makeApiRequest(`/user/${params.user_id}`);
            return this.formatResponse(data);
          }

          case "get_user_by_username": {
            const params = GetUserByUsernameSchema.parse(args);
            const data = await this.makeApiRequest(`/user/${params.username}`);
            return this.formatResponse(data);
          }

          // Player Tools
          case "get_player": {
            const params = GetPlayersSchema.parse(args);
            const player = Object.values(sleeper_players_json_def).find(p => p.player_id === params.player_id);
            if (!player) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `Player with ID ${params.player_id} not found`
              );
            }
            return this.formatResponse(player);

            /**** For the API, refactored to use local lookup though
            const params = GetPlayersSchema.parse(args);
            const data = await this.makeApiRequest(`/players/${params.sport}`);
            return this.formatResponse(data);
            */
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

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const availablePrompts = getAvailablePrompts();
      return {
        prompts: availablePrompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments.map(arg => ({
            name: arg.name,
            description: arg.description,
            required: arg.required
          }))
        }))
      };
    });

    // Handle prompt generation
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const promptDefinition = getPromptDefinition(name);
        if (!promptDefinition) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown prompt: ${name}`
          );
        }

        // Validate required arguments
        const requiredArgs = promptDefinition.arguments.filter(arg => arg.required);
        for (const requiredArg of requiredArgs) {
          if (!args || !(requiredArg.name in args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Missing required argument: ${requiredArg.name}`
            );
          }
        }

        const generatedPrompt = generatePrompt(name, args as McpPromptArguments);
        
        return {
          description: promptDefinition.description,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: generatedPrompt
              }
            }
          ]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const availableResources = getAvailableResources();
      return {
        resources: availableResources
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        const resourceContent = readResource(uri);
        
        return {
          contents: [resourceContent]
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Initialize the MCP server (without starting HTTP transport)
   */
  async initialize(port: string): Promise<void> {
    // Create transport but don't start it yet - it will be started when handling HTTP requests
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        console.log(`MCP session initialized: ${sessionId}`);
      },
      onsessionclosed: (sessionId) => {
        console.log(`MCP session closed: ${sessionId}`);
      },
      enableJsonResponse: false, // Use SSE for streaming
      allowedHosts: ['localhost', '127.0.0.1'],
      allowedOrigins: ['http://localhost:' + port, 'http://127.0.0.1:' + port],
      enableDnsRebindingProtection: false
    });

    await this.server.connect(this.transport);
    console.log("Sleeper MCP server initialized with HTTP transport");
  }

  /**
   * Handle HTTP requests for MCP communication
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    if (!this.transport) {
      throw new Error("MCP server not initialized. Call initialize() first.");
    }
    
    await this.transport.handleRequest(req, res, parsedBody);
  }

  /**
   * Get the transport instance (for direct access if needed)
   */
  getTransport(): StreamableHTTPServerTransport | undefined {
    return this.transport;
  }

  /* In case you want to use stdio instead of HTTP */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    await this.server.notification({
      method: 'notifications/message',
      params: {
        level: "info",
        logger: "my-sleeper-fantasy-football'",
        data: "Server has started successfully"
      }
    });
  }

  /****
   * Example claude_desktop_config.json entry to run this MCP server
   *
      {
        "mcpServers": {
          "sleeper-agent": {
            "command": "node",
            "args": ["/Users/peternummerdor/dev/repos/sleeper-agent/dist/index.js"]
          }
        }
      }
    ****/
}