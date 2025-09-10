/**
 * Sleeper Fantasy Football MCP Resources
 * 
 * This module provides resource definitions and handlers for the Sleeper MCP server.
 * It manages access to static resources like player databases and other data files.
 */

import * as fs from "fs";
import * as path from "path";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {McpResourceDefinition, McpResourceContent} from "../types";

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

const RESOURCE_LIST: McpResourceDefinition[] = [
  {
    uri: "file://sleeper_players_def.json",
    name: "Sleeper NFL Players Database",
    description: "Complete database of NFL players with essential fantasy football information including player_id, full_name, number, weight, height, age, and fantasy_positions",
    mimeType: "application/json"
  }
];

// ============================================================================
// RESOURCE HANDLER FUNCTIONS
// ============================================================================

/**
 * Read the Sleeper players database resource
 */
function readPlayersDatabase(): string {
  const resourcePath = path.join(__dirname, "files", "sleeper_players_def.json");
  
  if (!fs.existsSync(resourcePath)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Resource file not found: ${resourcePath}`
    );
  }
  
  return fs.readFileSync(resourcePath, 'utf8');
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Get the list of available resources
 * @returns Array of available resource definitions
 */
export function getAvailableResources(): McpResourceDefinition[] {
  return RESOURCE_LIST;
}

/**
 * Read a specific resource by URI
 * @param uri The resource URI to read
 * @returns The resource content
 */
export function readResource(uri: string): McpResourceContent {
  try {
    switch (uri) {
      case "file://sleeper_players_def.json":
        const data = readPlayersDatabase();
        return {
          uri: uri,
          mimeType: "application/json",
          text: data
        };
      
      default:
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource URI: ${uri}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a specific resource definition by URI
 * @param uri The resource URI
 * @returns The resource definition or null if not found
 */
export function getResourceDefinition(uri: string): McpResourceDefinition | null {
  return RESOURCE_LIST.find(resource => resource.uri === uri) || null;
}