import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseAgent, AgentPerception, AgentReasoning, AgentAction, AnthropicConfig } from "./BaseAgent";

export class StockInformationAgent extends BaseAgent {
  private systemPrompt = `You are a knowledgeable stock market analyst assistant. Your role is to:

      1. Analyze user queries about stocks, market trends, and financial information
      2. Provide accurate, helpful responses about stock prices, company performance, market analysis and consumer sentiment
      3. Synthesize complex financial information into clear, actionable insights
      4. Always include appropriate disclaimers about financial advice

      Guidelines:
      - Be factual and data-driven in your analysis
      - Explain your reasoning clearly
      - Include relevant context and background information
      - If you don't have current data, clearly state this limitation`;

  constructor(config: AnthropicConfig = {}) {
    super({
      ...config,
      model: config.model || "claude-3-sonnet-20240229",
      temperature: config.temperature || 0.3,
    });
  }

  protected async reason(perception: AgentPerception): Promise<AgentReasoning> {
    const reasoningPrompt = `
      Analyze this stock-related query: "${perception.input}"

      Context: ${JSON.stringify(perception.context, null, 2)}

      Please provide:
      1. Analysis of what the user is asking
      2. A plan for how to respond effectively

      Format your response as JSON with these fields: analysis, plan (array of strings), confidence (number)
      `;
      //3. Your confidence level (0-1) in being able to provide a helpful response

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

Please provide a comprehensive response about the stock information requested. 

Remember to:
- Be informative and helpful
- Include relevant financial context
- Add appropriate disclaimers about financial advice
- Structure your response clearly

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
      type: "stock_information_response",
      parameters: {
        confidence: reasoning.confidence,
        analysis: reasoning.analysis,
        plan: reasoning.plan
      },
      response: response.content as string
    };
  }

  protected override async perceive(input: string, context?: Record<string, any>): Promise<AgentPerception> {
    const basePerception = await super.perceive(input, context);
    
    const enhancedContext = {
      ...basePerception.context,
      queryType: this.classifyQuery(input),
      timestamp: basePerception.timestamp.toISOString()
    };

    return {
      ...basePerception,
      context: enhancedContext
    };
  }

  private classifyQuery(input: string): string {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('value')) {
      return 'price_inquiry';
    } else if (lowerInput.includes('analysis') || lowerInput.includes('recommend') || lowerInput.includes('should i')) {
      return 'analysis_request';
    } else if (lowerInput.includes('news') || lowerInput.includes('update') || lowerInput.includes('recent')) {
      return 'news_inquiry';
    } else if (lowerInput.includes('compare') || lowerInput.includes('vs') || lowerInput.includes('versus')) {
      return 'comparison_request';
    } else {
      return 'general_inquiry';
    }
  }

  public async getStockInfo(symbol: string, additionalContext?: Record<string, any>): Promise<string> {
    const query = `Please provide information about ${symbol} stock`;
    const context = {
      ...additionalContext,
      stockSymbol: symbol,
      requestType: 'direct_lookup'
    };
    
    return this.run(query, context);
  }
}