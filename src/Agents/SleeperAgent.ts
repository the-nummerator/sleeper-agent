import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseAgent, AgentPerception, AgentReasoning, AgentAction, AnthropicConfig } from "./BaseAgent";
import fetch from "node-fetch";

export class SleeperAgent extends BaseAgent {
  private sleeperMcpBaseUrl: string;
  private availableTools = [];

  constructor(config: AnthropicConfig = {}) {
    super({
      ...config,
      model: config.model || "claude-3-5-sonnet-20241022",
      temperature: config.temperature || 0.8,
    });

    // MCP server is running on the main Express server port at /mcp endpoint
    const port = process.env.ROUTER_PORT || 3000;
    this.sleeperMcpBaseUrl = `http://localhost:${port}/mcp`;
  }
  
  private systemPrompt = `You are an expert fantasy football analyst specializing in Sleeper league data. Your role is to:

      1. Analyze fantasy football queries about leagues, rosters, matchups, and player performance
      2. Provide accurate, insightful responses about team strategies, weekly performance, and league standings
      3. Synthesize complex fantasy data into clear, actionable insights for league members
      4. Generate entertaining weekly summaries with strategic analysis and playful commentary

      Guidelines:
      - Be factual and data-driven in your fantasy football analysis
      - Use specific player names and statistics to support your insights
      - Include strategic recommendations for roster management
      - Maintain an engaging, slightly competitive tone appropriate for fantasy leagues
      - Reference league history and context when relevant`;

  /* 
  Perceive (Information Gathering)
    What it does: This is where your agent gathers all relevant information needed to make decisions. The agent observes its environment, retrieves context, and collects data.
    Developer considerations:

    Tool selection: Choose appropriate tools for information retrieval (web search, database queries, API calls, vector store searches)
    Query formulation: Craft effective queries based on the current objective
    Data quality: Validate and filter incoming data to avoid noise
    Parallelization: Consider gathering multiple pieces of information concurrently when possible
    Error handling: Plan for failed API calls, missing data, or timeout scenarios

    In LangChain:

    Use agents with tools (e.g., create_react_agent, create_openai_functions_agent)
    Implement custom tools with the @tool decorator
    Leverage retrievers for RAG (Retrieval Augmented Generation) patterns
  */
  protected override async perceive(input: string, context?: Record<string, any>): Promise<AgentPerception> {
    const basePerception = await super.perceive(input, context);
    
    // Get available MCP tools if we're working with MCP context
    if (this.availableTools.length === 0 || context?.useMCPTools) {
      try {
        const toolsResponse = await this.getMCPTools();
        this.availableTools = toolsResponse?.tools || [];
      } catch (error) {
        console.error('Failed to fetch MCP tools:', error);
      }
    }
    
    const enhancedContext = {
      ...basePerception.context,
      queryType: this.classifyQuery(input),
      timestamp: basePerception.timestamp.toISOString(),
      availableTools: this.availableTools,
      toolsCount: this.availableTools.length
    };

    return {
      ...basePerception,
      context: enhancedContext
    };
  }
  
  /**
   * Fetch available MCP tools from the MCP server
   */
  private async getMCPTools(): Promise<any> {
    try {
      const mcpRequest = {
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: Date.now()
      };

      const response = await fetch(this.sleeperMcpBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mcpRequest)
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      return data.result;
    } catch (error) {
      console.error('Error fetching MCP tools:', error);
      return { tools: [] };
    }
  }

  /* 
  Reason (Decision Making)
  What it does: The agent processes the gathered information, analyzes it in context of the goal, and decides what action to take next. This is where the LLM's reasoning capabilities shine.
  Developer considerations:

  Prompt engineering: Structure prompts to guide logical reasoning (chain-of-thought, step-by-step thinking)
  Context injection: Provide the right amount of context without overwhelming the model
  Reasoning strategies: Choose between techniques like ReAct, Plan-and-Execute, or Tree of Thoughts
  Confidence assessment: Build in mechanisms to evaluate uncertainty
  Goal alignment: Ensure reasoning stays aligned with the original objective
  Token efficiency: Be mindful of token usage, especially with long reasoning chains

  In LangChain:

  Use structured output with Pydantic models to ensure reliable reasoning outputs
  Implement custom reasoning chains with LCEL (LangChain Expression Language)
  Consider LLMChain or SequentialChain for multi-step reasoning
*/  
  protected async reason(perception: AgentPerception): Promise<AgentReasoning> {
    const reasoningPrompt = `
      Analyze this fantasy football query: "${perception.input}"

      Context: ${JSON.stringify(perception.context, null, 2)}

      Please provide:
      1. Analysis of what the user is asking about their fantasy league
      2. A plan for how to respond effectively with relevant data
      3. Your confidence level in providing a helpful fantasy football response

      Format your response as JSON with these fields: analysis, plan (array of strings), confidence (number)
      `;

    const messages = [
      new SystemMessage(this.systemPrompt),
      new HumanMessage(reasoningPrompt)
    ];

    const response = await this.llm.invoke(messages);
    
    try {
      const reasoning = JSON.parse(response.content as string);
      return {
        analysis: reasoning.analysis || "Unable to analyze query",
        plan: reasoning.plan || ["Provide general response"],
        confidence: reasoning.confidence || 0.5
      };
    } catch (error) {
      return {
        analysis: "Failed to parse reasoning response",
        plan: ["Provide direct response to query"],
        confidence: 0.3
      };
    }
  }

  protected async act(reasoning: AgentReasoning): Promise<AgentAction> {
    const actionPrompt = `
      Based on this analysis: ${reasoning.analysis}

      Following this plan: ${reasoning.plan.join("; ")}

      Please provide a comprehensive response about the fantasy football information requested. 

      Remember to:
      - Be informative and entertaining
      - Include specific player names and statistics when relevant
      - Provide strategic insights for fantasy league management
      - Structure your response clearly with engaging commentary

      Provide your response directly (no JSON formatting needed).
      `;

    const recentMemory = this.getRecentMemory(6);
    const messages = [
      new SystemMessage(this.systemPrompt),
      ...recentMemory,
      new HumanMessage(actionPrompt)
    ];

    const response = await this.llm.invoke(messages);
    
    return {
      type: "fantasy_football_response",
      parameters: {
        confidence: reasoning.confidence,
        analysis: reasoning.analysis,
        plan: reasoning.plan
      },
      response: response.content as string
    };
  }

  private classifyQuery(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('matchup') || lowerInput.includes('score') || lowerInput.includes('week')) {
      return 'matchup_inquiry';
    } else if (lowerInput.includes('roster') || lowerInput.includes('lineup') || lowerInput.includes('player')) {
      return 'roster_analysis';
    } else if (lowerInput.includes('standing') || lowerInput.includes('ranking') || lowerInput.includes('record')) {
      return 'standings_inquiry';
    } else if (lowerInput.includes('trade') || lowerInput.includes('waiver') || lowerInput.includes('pickup')) {
      return 'transaction_analysis';
    } else if (lowerInput.includes('summary') || lowerInput.includes('recap') || lowerInput.includes('report')) {
      return 'weekly_summary';
    } else if (lowerInput.includes('compare') || lowerInput.includes('vs') || lowerInput.includes('versus')) {
      return 'comparison_request';
    } else {
      return 'general_inquiry';
    }
  }

  public async analyzeLeague(leagueId: string, analysisType: string = 'general', additionalContext?: Record<string, any>): Promise<string> {
    const query = `Please provide a ${analysisType} analysis of the fantasy football league`;
    const context = {
      ...additionalContext,
      leagueId: leagueId,
      analysisType: analysisType,
      requestType: 'league_analysis'
    };
    
    return this.run(query, context);
  }
}