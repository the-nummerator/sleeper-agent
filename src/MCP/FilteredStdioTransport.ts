import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse } from "@modelcontextprotocol/sdk/types.js";
import { Readable, Writable } from "stream";
import * as readline from "readline";

/**
 * Custom Stdio Transport that filters non-JSON-RPC messages
 * Allows console.log and other output while maintaining MCP communication
 */
class FilteredStdioTransport implements Transport {
  private _reader: readline.Interface;
  private _writer: Writable;
  private _messageHandlers = new Set<(message: JSONRPCMessage) => void>();
  private _closeHandlers = new Set<() => void>();
  private _errorHandlers = new Set<(error: Error) => void>();
  private _started = false;

  constructor(
    private input: Readable = process.stdin,
    private output: Writable = process.stdout
  ) {
    this._writer = this.output;
    
    // Create readline interface for line-by-line processing
    this._reader = readline.createInterface({
      input: this.input,
    });

    this.setupInputHandling();
  }

  private setupInputHandling(): void {
    this._reader.on('line', (line: string) => {
      // Skip empty lines
      if (!line.trim()) {
        return;
      }

      // Try to parse as JSON-RPC
      try {
        const parsed = JSON.parse(line);
        
        // Check if it's a valid JSON-RPC message
        if (this.isValidJSONRPC(parsed)) {
          // Forward to MCP handlers
          for (const handler of this._messageHandlers) {
            handler(parsed);
          }
        } else {
          // Not a JSON-RPC message - log to stderr and ignore
          process.stderr.write(`[MCP] Ignoring non-JSON-RPC input: ${line.substring(0, 100)}...\n`);
        }
      } catch (error) {
        // Not valid JSON - log to stderr and ignore
        process.stderr.write(`[MCP] Ignoring non-JSON input: ${line.substring(0, 100)}...\n`);
      }
    });

    this._reader.on('close', () => {
      for (const handler of this._closeHandlers) {
        handler();
      }
    });

    this._reader.on('error', (error: Error) => {
      for (const handler of this._errorHandlers) {
        handler(error);
      }
    });
  }

  private isValidJSONRPC(obj: any): obj is JSONRPCMessage {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    // Must have jsonrpc field
    if (obj.jsonrpc !== '2.0') {
      return false;
    }

    /* This feels limiting - idk, commenting out for now


    // Must be either a request, response, or notification
    const hasMethod = typeof obj.method === 'string';
    const hasId = obj.id !== undefined;
    const hasResult = obj.result !== undefined;
    const hasError = obj.error !== undefined;

    // Request: has method and id
    // Notification: has method but no id
    // Response: has id and (result or error)
    return (
      (hasMethod && hasId) ||      // Request
      (hasMethod && !hasId) ||     // Notification
      (hasId && (hasResult || hasError)) // Response
    );

    */

    else { return true }
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this._messageHandlers.add(handler);
  }

  onClose(handler: () => void): void {
    this._closeHandlers.add(handler);
  }

  onError(handler: (error: Error) => void): void {
    this._errorHandlers.add(handler);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._started) {
      throw new Error("Transport not started");
    }

    const serialized = JSON.stringify(message) + '\n';
    
    return new Promise((resolve, reject) => {
      this._writer.write(serialized, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async start(): Promise<void> {
    if (this._started) {
      return;
    }

    // Create readline interface for line-by-line processing
    this._reader = readline.createInterface({
      input: this.input
    });

    this.setupInputHandling();
    this._started = true;
  }

  async close(): Promise<void> {
    if (!this._started) {
      return;
    }

    this._reader?.close();
    
    // Don't close stdout/stderr as other parts of the app might need them
    if (this._writer !== process.stdout && this._writer !== process.stderr) {
      this._writer.end();
    }

    this._started = false;
  }
}