import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";

export interface AgentPerception {
  input: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface AgentReasoning {
  analysis: string;
  plan: string[];
  confidence: number;
}

export interface AgentAction {
  type: string;
  parameters: Record<string, any>;
  response: string;
}

export interface AnthropicConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export abstract class BaseAgent {
  protected llm: ChatAnthropic;
  protected memory: BaseMessage[] = [];
  protected isRunning: boolean = false;

  constructor(config: AnthropicConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error("Anthropic API key is required. " +
        "Set ANTHROPIC_API_KEY environment variable or pass apiKey in config.");
    }

    this.llm = new ChatAnthropic({
      apiKey,
      model: config.model || "claude-sonnet-4-5-20250929",
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
    });
  }

  public async run(input: string, context?: Record<string, any>): Promise<string> {
    if (this.isRunning) {
      throw new Error("Agent is already running");
    }

    this.isRunning = true;

    try {
      const perception = await this.perceive(input, context);
      const reasoning = await this.reason(perception);
      const action = await this.act(reasoning);
      
      this.updateMemory(input, action.response);
      
      return action.response;
    } finally {
      this.isRunning = false;
    }
  }

  protected async perceive(input: string, context?: Record<string, any>): Promise<AgentPerception> {
    return {
      input: input.trim(),
      context: context || {},
      timestamp: new Date()
    };
  }

  protected abstract reason(perception: AgentPerception): Promise<AgentReasoning>;

  protected abstract act(reasoning: AgentReasoning): Promise<AgentAction>;

  protected updateMemory(input: string, response: string): void {
    this.memory.push(new HumanMessage(input));
    this.memory.push(new AIMessage(response));
    
    if (this.memory.length > 10) {
      this.memory = this.memory.slice(-10);
    }
  }

  protected getRecentMemory(limit: number = 10): BaseMessage[] {
    return this.memory.slice(-limit);
  }

  public clearMemory(): void {
    this.memory = [];
  }
}