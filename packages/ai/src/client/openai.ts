import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';
import type { AIResponse, AIRequestContext, ToolCall } from '../types';
import { TOOL_DEFINITIONS } from '../tools/definitions';
import { ToolHandlers } from '../tools/handlers';
import { SafetyManager } from '../guardrails/safety';
import { configManager } from '@ahh-ai/config';
import type { AirtableService } from '@ahh-ai/integrations';

export class OpenAIClient {
  private client: OpenAI;
  private toolHandlers: ToolHandlers;
  private safetyManager: SafetyManager;

  constructor(airtableService: AirtableService, emailService?: any) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.toolHandlers = new ToolHandlers(airtableService, emailService);
    this.safetyManager = new SafetyManager();
  }

  async processRequest(
    message: string,
    context: AIRequestContext = {},
    conversationHistory: ChatCompletionMessageParam[] = []
  ): Promise<AIResponse> {
    
    // Process and validate the incoming request
    const processedRequest = this.safetyManager.processIncomingRequest(message);
    
    // Perform initial safety check
    const safetyCheck = await this.safetyManager.checkRequestSafety(message);
    
    if (!safetyCheck.passed && safetyCheck.risk_level === 'high') {
      // Immediate escalation for high-risk requests
      return {
        message: "I'm escalating your request to our team for immediate assistance. Someone will contact you shortly.",
        confidence: 1.0,
        risk_flags: ['emergency_keywords'],
        requires_approval: true,
        reasoning: `High-risk request detected: ${safetyCheck.violations.join(', ')}`
      };
    }

    try {
      // Load prompts and configuration
      const prompts = await configManager.getPromptConfig();

      // Build conversation context
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: prompts.system
        },
        {
          role: 'system', 
          content: prompts.tools
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      // Add context information
      if (context.booking_context) {
        messages.splice(-1, 0, {
          role: 'system',
          content: `Booking context: ${JSON.stringify(context.booking_context, null, 2)}`
        });
      }

      if (context.property_context) {
        messages.splice(-1, 0, {
          role: 'system',
          content: `Property context: ${JSON.stringify(context.property_context, null, 2)}`
        });
      }

      // Convert our tool definitions to OpenAI format
      const tools: ChatCompletionTool[] = Object.values(TOOL_DEFINITIONS).map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      // Call OpenAI with function calling
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 1000
      });

      const response = completion.choices[0].message;
      let finalMessage = response.content || '';
      const tool_calls: ToolCall[] = [];

      // Execute any tool calls
      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          const executedTool: ToolCall = {
            name: toolName,
            arguments: toolArgs,
            success: false
          };

          const result = await this.toolHandlers.executeToolCall(executedTool);
          tool_calls.push(result);

          // Add tool result to conversation for final response
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall]
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.result)
          });
        }

        // Get final response after tool execution
        const finalCompletion = await this.client.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages,
          temperature: 0.3,
          max_tokens: 1000
        });

        finalMessage = finalCompletion.choices[0].message.content || '';
      }

      // Calculate confidence score based on various factors
      const confidence = this.calculateConfidence(
        finalMessage,
        tool_calls,
        processedRequest,
        safetyCheck
      );

      // Validate the response for safety
      const responseValidation = await this.safetyManager.validateResponse(
        message,
        finalMessage,
        confidence
      );

      if (!responseValidation.safe) {
        // Response failed safety check - escalate
        return {
          message: "I need to have a human team member review your request to ensure I provide accurate information. Someone will get back to you shortly.",
          confidence: 0.0,
          risk_flags: responseValidation.risk_flags,
          requires_approval: true,
          reasoning: responseValidation.reason
        };
      }

      // Check if approval is required
      const approvalCheck = await this.safetyManager.shouldRequireApproval(
        confidence,
        responseValidation.risk_flags,
        !context.conversation_history || context.conversation_history.length === 0
      );

      return {
        message: finalMessage,
        confidence,
        tool_calls,
        risk_flags: responseValidation.risk_flags,
        requires_approval: approvalCheck.required,
        reasoning: approvalCheck.reason
      };

    } catch (error) {
      console.error('Error processing OpenAI request:', error);
      
      return {
        message: "I'm having trouble processing your request right now. Let me have a team member assist you directly.",
        confidence: 0.0,
        risk_flags: ['low_confidence'],
        requires_approval: true,
        reasoning: `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private calculateConfidence(
    message: string,
    toolCalls: ToolCall[],
    processedRequest: any,
    safetyCheck: any
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for failed tool calls
    const failedTools = toolCalls.filter(t => !t.success);
    if (failedTools.length > 0) {
      confidence -= failedTools.length * 0.2;
    }

    // Reduce confidence for emergency situations
    if (processedRequest.emergency_detected) {
      confidence -= 0.3;
    }

    // Reduce confidence for negative sentiment
    if (processedRequest.sentiment === 'negative') {
      confidence -= 0.1;
    }

    // Reduce confidence for safety violations
    if (!safetyCheck.passed) {
      confidence -= 0.2;
    }

    // Reduce confidence for very short or generic responses
    if (message.length < 50) {
      confidence -= 0.1;
    }

    // Increase confidence for successful tool usage
    const successfulTools = toolCalls.filter(t => t.success);
    if (successfulTools.length > 0) {
      confidence += successfulTools.length * 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a health check. Please respond with "OK".'
          }
        ],
        max_tokens: 10
      });

      return response.choices[0].message.content?.includes('OK') || false;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }
}