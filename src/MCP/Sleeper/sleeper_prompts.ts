/**
 * Sleeper Fantasy Football MCP Prompts
 * 
 * This module provides prompt generation functionality for the Sleeper MCP server.
 * It supports creating dynamic prompts for fantasy football analysis and insights.
 */

import { McpPromptArguments, McpGeneratedPrompt } from "../types";

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
    name: "tuesday_summary",
    description: "Generate a summary of the previous week's games with comical roasts",
    arguments: [
      {
        name: "league_id",
        description: "The league ID to summarize",
        required: true,
        schema: {
          type: "string",
          enum: ['1255621170552655872']
        }
      },
      {
        name: "summary_type",
        description: "Type of summary to generate, with options",
        required: true,
        schema: {
          type: "string",
          enum: ['regular_summary'],
        }
        
      },
    ]
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
 * Generate a prompt for fantasy football analysis
 */
function generateTuesdaySummaryPrompt(args: McpPromptArguments): string {
  const { league_id, summary_type, week } = args;
  
  let basePrompt = `You are a fantasy football expert analyzing Sleeper league data for league ${league_id}. 
                    You are also a sports writer with a deep understanding of football dynamics who has 
                    a comical lean to roast players and league teams.
                    Before you generate any text, calculate the margin of victory between all matches.`;
  
  switch (summary_type) {
    case "regular_summary":
      return `${basePrompt}

        Calculate the margins of victories for all matches before you answer. Once calculated, please provide a summary 
        of the previous week's matches including:

        1. Brief written account of three teams: King of the Week (the team with the highest score), 
            the Weekly Lamb (the team with the lowest score), the Biggest Blowout (the match with 
            the largest margin of victory), and the Close but No Cigar (the losing team of the match 
            with the lowest margin of victory). Annotate these with burns and 
            jabs at the teams involved.

        2. A summary of all matchups and their outcomes. Include a table of each match - one row per match. 
            For each match include a column for each team, each team's respective score, the winner marked 
            with a football emoji, the margin of victory and a one sentence summary of the matchup.

        3. A list of standings - validate you have the right record with the league API. Briefly 
            summarize playoff implications based on the standings.

        Use the available Sleeper MCP tools to gather relevant league data. Validate your math. 
        Always look up users in the league and use team_name for rosters and team references. 
        When summarizing player actions for a given team, make sure that player is actual 
        on that team's roster.`;

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
      return generateTuesdaySummaryPrompt(args);
    
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