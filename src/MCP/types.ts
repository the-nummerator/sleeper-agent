// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface McpPromptArguments {
  [key: string]: string | number | boolean;
}

export interface McpGeneratedPrompt {
  description: string;
  arguments: McpPromptArguments;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface MCPServer {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: Record<string, any>): Promise<MCPResult>;
  listResources(): Promise<MCPResource[]>;
  getResource(uri: string): Promise<MCPResourceContent>;
}

export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: Uint8Array;
}

export interface MCPResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    resource?: {
      uri: string;
      mimeType: string;
    };
  }>;
  isError?: boolean;
}