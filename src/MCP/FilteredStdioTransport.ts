import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { Readable, Writable } from "stream";
import * as readline from "readline";

/**
 * Custom Stdio Transport that filters non-JSON-RPC messages
 * Extends StdioServerTransport and filters stdin to ignore non-JSON RPC messages
 * Allows console.log and other output while maintaining clean MCP communication
 */
export class FilteredStdioTransport extends StdioServerTransport {
  private _reader: readline.Interface;
  private _writer: Writable;
  private _originalOnMessage: ((message: JSONRPCMessage) => void)  | undefined;
  private _filtered_started = false;

  constructor(
    private input: Readable = process.stdin,
    private output: Writable = process.stdout
  ) {
    // Pass input and output to parent StdioServerTransport
    super(input, output);
    
    this._writer = output;
    this._reader = readline.createInterface({
      input,
      output: undefined, // Don't echo to stdout
      crlfDelay: Infinity
    });
  }

  /**
   * Override start to implement custom filtering
   */
  override async start(): Promise<void> {
    if (this._filtered_started) {
      throw new Error("Transport already started");
    }

    console.error("Starting FilteredStdioTransport");

    // Store original onmessage handler
    this._originalOnMessage = this.onmessage;

    // Set up our filtered message handling
    this._reader.on('line', (line: string) => {
      try {
        const trimmed = line.trim();
        if (!trimmed) {
          return; // Ignore empty lines
        }

        console.error("Read line:", trimmed);

        const obj = JSON.parse(trimmed);
        
        if (this.isValidJSONRPC(obj) && this.isValidMCPMessage(obj)) {
          console.error("Is valid JSON-RPC and MCP message, forwarding");
          if (this._originalOnMessage) {
            try {
              this._originalOnMessage(obj);
            } catch (error) {
              console.error("Error in message handler:", error);
              if (this.onerror) {
                this.onerror(error as Error);
              }
            }
          }
        } else {
          console.error("Not a valid JSON-RPC/MCP message, ignoring");
        }
      } catch (error) {
        // Not valid JSON, ignore non-JSON lines
        console.error("Not valid JSON, ignoring:", line);
      }
    });

    this._reader.on('close', () => {
      console.error("Reader closed");
      if (this.onclose) {
        this.onclose();
      }
    });

    this._reader.on('error', (error: Error) => {
      console.error("Reader error:", error);
      if (this.onerror) {
        this.onerror(error);
      }
    });

    this._filtered_started = true;
  }

  /**
   * Validate JSON-RPC message structure
   */
  private isValidJSONRPC(obj: any): obj is JSONRPCMessage {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    console.error("Validating JSON-RPC of:", obj);

    // Must have jsonrpc field
    return (obj.jsonrpc == '2.0');
  }

  /**
   * Validate MCP-specific message requirements
   */
  private isValidMCPMessage(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // If it's a request/notification, validate method names
    if (obj.method) {
      const validMethods = [
        // Standard MCP methods
        'initialize',
        'notifications/initialized',
        'ping',
        'tools/list',
        'tools/call',
        'resources/list',
        'resources/read',
        'prompts/list',
        'prompts/get',
        'completion/complete',
        'roots/list',
        'sampling/createMessage',
        'logging/setLevel',
        // Notification methods
        'notifications/message',
        'notifications/progress',
        'notifications/cancelled',
        'notifications/roots/list_changed',
        'notifications/resources/list_changed',
        'notifications/resources/updated',
        'notifications/tools/list_changed',
        'notifications/prompts/list_changed'
      ];

      if (!validMethods.includes(obj.method)) {
        console.error("Invalid MCP method:", obj.method);
        return false;
      }
    }

    // If it's a response, validate it has appropriate structure
    if (obj.id !== undefined && !obj.method) {
      // Should have either result or error
      if (obj.result === undefined && obj.error === undefined) {
        console.error("Response missing result or error");
        return false;
      }
    }

    return true;
  }

  /**
   * Override close to clean up our resources
   */
  override async close(): Promise<void> {
    if (!this._filtered_started) {
      return;
    }

    console.error("Closing FilteredStdioTransport");

    this._reader?.close();
    
    // Call parent close
    await super.close();

    this._filtered_started = false;
  }
}