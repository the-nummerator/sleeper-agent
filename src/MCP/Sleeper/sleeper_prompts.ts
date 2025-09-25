/**
 * Sleeper Fantasy Football MCP Prompts
 * 
 * This module provides prompt generation functionality for the Sleeper MCP server.
 * It supports creating dynamic prompts for fantasy football analysis and insights.
 */

import { McpPromptArguments, McpGeneratedPrompt } from "../types";
import { weeklySummaryPrompt } from "./prompts/weekly_summary_prompt";

// ============================================================================
// PROMPT DEFINITIONS
// ============================================================================

const PROMPT_LIST = [
  {
    name: "fantasy_analyzer",
    description: "Analyze fantasy football data and provide strategic insights",
    arguments: [
      {
        name: "league_id",
        description: "The league ID to analyze",
        required: true,
        schema: {
          type: "string",
          enum: ['1255621170552655872']
        }
      },
      {
        name: "analysis_type",
        description: "Type of analysis to perform",
        required: true,
        schema: {
          type: "string",
          enum: ['roster_analysis', 'matchup_analysis', 'trade_analysis', 'season_recap'],
        }
      },
      {
        name: "week",
        description: "Week number for weekly analysis",
        required: false,
        schema: {
          type: "integer",
          enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        }
      }
    ]
  },
  {
    name: "weekly_summary",
    description: "Generate a summary of the previous week's games and current standings",
    arguments: []
  }
];

// ============================================================================
// PROMPT GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a prompt for fantasy football analysis
 */
function generateFantasyAnalyzerPrompt(args: McpPromptArguments): string {
  const { league_id, analysis_type, week } = args;
  
  let basePrompt = `You are a fantasy football expert analyzing Sleeper league data for league ${league_id}. 
                    You are also a sports writer with a comical lean.`;
  
  switch (analysis_type) {
    case "roster_analysis":
      return `${basePrompt}

        Please analyze the current rosters in this league and provide:
        1. Team strength rankings based on current roster composition
        2. Identification of teams with the strongest/weakest positions
        3. Potential trade opportunities between teams
        4. Roster construction strategies for each team

        Use the available Sleeper MCP tools to gather league rosters, users, and current standings data.`;

            case "matchup_analysis":
              if (!week) {
                throw new Error("Week number is required for matchup analysis");
              }
              return `${basePrompt}

        Please analyze the matchups for week ${week} and provide:
        1. Projected winners for each matchup based on roster strength
        2. Key players to watch in each matchup
        3. Potential upset predictions with reasoning

        Use the Sleeper MCP tools to gather matchup data, rosters, and user information.`;

            case "trade_analysis":
              return `${basePrompt}

        Please analyze recent trading activity and provide:
        1. Summary of all recent trades in the league
        2. Analysis of which teams got better/worse from trades
        3. Identification of teams that should be trading
        4. Potential future trade scenarios that make sense

        Use the Sleeper MCP tools to gather transaction history and roster data.`;

            case "season_recap":
              return `${basePrompt}

        Please provide a comprehensive season analysis including:
        1. Overall league standings and playoff picture
        2. Most successful teams and their strategies
        3. Biggest surprises and disappointments
        4. Key transactions that shaped the season
        5. Playoff predictions and championship favorites

        Use all available Sleeper MCP tools to gather comprehensive league data.`;

            default:
              return `${basePrompt}

        Please provide a general analysis of this fantasy football league including:
        1. Current standings and team performance
        2. Notable roster constructions and strategies  
        3. Recent transaction activity
        4. League competitiveness and engagement

        Use the available Sleeper MCP tools to gather relevant league data.`;
  }
}

/**
 * Generate a comprehensive weekly summary prompt
 */
function generateWeeklySummaryPrompt(args: McpPromptArguments): string {
  const { } = args;
  return weeklySummaryPrompt;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate a prompt based on the prompt name and arguments
 * @param promptName The name of the prompt to generate
 * @param args The arguments for prompt generation
 * @returns The generated prompt string
 */
export function generatePrompt(promptName: string, args: McpPromptArguments = {}): string {
  switch (promptName) {
    case "fantasy_analyzer":
      return generateFantasyAnalyzerPrompt(args);
    case "tuesday_summary":
      return generateWeeklySummaryPrompt(args);
    
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}

/**
 * Get the list of available prompts
 * @returns Array of available prompt definitions
 */
export function getAvailablePrompts() {
  return PROMPT_LIST;
}

/**
 * Get a specific prompt definition by name
 * @param promptName The name of the prompt
 * @returns The prompt definition or null if not found
 */
export function getPromptDefinition(promptName: string) {
  const prompts = getAvailablePrompts();
  return prompts.find(p => p.name === promptName) || null;
}