import type { AIResponse, AIRequestContext } from './types';
import { OpenAIClient } from './client/openai';
import type { AirtableService } from '@ahh-ai/integrations';
import type { InboundEmail } from '@ahh-ai/core';
import { sanitizeEmail } from '@ahh-ai/core';

export class AIReceptionistService {
  private openAIClient: OpenAIClient;

  constructor(
    private airtableService: AirtableService,
    private _emailService?: any // To be implemented later
  ) {
    this.openAIClient = new OpenAIClient(airtableService, this._emailService);
  }

  async handleInboundEmail(email: InboundEmail): Promise<AIResponse> {
    try {
      // Build context from the email
      const context = await this.buildContextFromEmail(email);
      
      // Process the email content
      const response = await this.openAIClient.processRequest(
        email.body,
        context,
        [] // TODO: Load conversation history from thread_id
      );

      // Log the interaction
      await this.logInteraction(email, response, context);

      // If approval is required, create the approval queue entry
      if (response.requires_approval) {
        await this.createApprovalQueueEntry(email, response, context);
      }

      return response;

    } catch (error) {
      console.error('Error handling inbound email:', error);
      
      return {
        message: "I'm having trouble processing your email right now. A team member will review your message and respond shortly.",
        confidence: 0.0,
        risk_flags: ['low_confidence'],
        requires_approval: true,
        reasoning: `Service error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async handleTextQuery(
    message: string,
    guestEmail?: string,
    conversationHistory?: any[]
  ): Promise<AIResponse> {
    try {
      // Build context if we have guest information
      let context: AIRequestContext = {};
      
      if (guestEmail) {
        const bookingContexts = await this.airtableService.getBookingContext(guestEmail);
        context.booking_context = bookingContexts[0]?.booking;
        context.property_context = bookingContexts[0]?.property;
      }

      context.conversation_history = conversationHistory || [];

      // Process the message
      const response = await this.openAIClient.processRequest(
        message,
        context,
        this.convertToOpenAIFormat(conversationHistory || [])
      );

      return response;

    } catch (error) {
      console.error('Error handling text query:', error);
      
      return {
        message: "I'm having trouble processing your message right now. Let me have a team member assist you.",
        confidence: 0.0,
        risk_flags: ['low_confidence'],
        requires_approval: true,
        reasoning: `Service error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async buildContextFromEmail(email: InboundEmail): Promise<AIRequestContext> {
    const context: AIRequestContext = {};

    // Try to find booking context using sender email
    try {
      const guestEmail = sanitizeEmail(email.from);
      const bookingContexts = await this.airtableService.getBookingContext(guestEmail);
      
      if (bookingContexts.length > 0) {
        context.booking_context = bookingContexts[0].booking;
        context.property_context = bookingContexts[0].property;
        
        // Check if this guest has been verified before
        const previousComms = bookingContexts[0].previous_comms || [];
        context.user_verified = previousComms.some(comm => 
          comm.approved_by && comm.body.toLowerCase().includes('verified')
        );
      }
    } catch (error) {
      console.warn('Could not build booking context:', error);
    }

    // Try to load conversation history from thread
    try {
      if (email.thread_id) {
        const threadComms = await this.airtableService.communications.getCommunicationsByThread(email.thread_id);
        context.conversation_history = threadComms.map(comm => ({
          role: comm.direction === 'inbound' ? 'user' : 'assistant',
          content: comm.body,
          timestamp: comm.sent_at
        }));
      }
    } catch (error) {
      console.warn('Could not load conversation history:', error);
    }

    return context;
  }

  private async logInteraction(
    email: InboundEmail,
    _response: AIResponse,
    context: AIRequestContext
  ): Promise<void> {
    try {
      // Log the inbound email
      await this.airtableService.communications.createCommunication({
        booking_id: context.booking_context?.booking_id,
        direction: 'inbound',
        channel: 'email',
        subject: email.subject,
        body: email.body,
        draft: false,
        from_address: email.from,
        to_address: email.to,
        thread_id: email.thread_id,
        sent_at: email.received_at,
      });

      // If we generated a response that needs approval, it will be logged by the tool handler
      
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }

  private async createApprovalQueueEntry(
    email: InboundEmail,
    response: AIResponse,
    context: AIRequestContext
  ): Promise<void> {
    try {
      const approvalPayload = {
        draft_reply: response.message,
        detected_topics: [context.booking_context ? 'booking_related' : 'general'],
        booking_context: context.booking_context ? {
          booking_id: context.booking_context.booking_id,
          guest_name: context.booking_context.guest_name,
          property_name: context.property_context?.name,
        } : undefined,
      };

      await this.airtableService.approvals.createApproval({
        type: 'reply',
        payload: approvalPayload,
        status: 'pending',
        risk_flags: response.risk_flags,
        confidence_score: response.confidence,
      });

      console.log(`Approval queue entry created for email from ${email.from}: ${response.reasoning}`);
      
    } catch (error) {
      console.error('Error creating approval queue entry:', error);
    }
  }

  private convertToOpenAIFormat(history: any[]): any[] {
    return history.map(item => ({
      role: item.role,
      content: item.content
    }));
  }

  async healthCheck(): Promise<{
    ai_service: boolean;
    airtable: boolean;
    overall: boolean;
  }> {
    const aiHealth = await this.openAIClient.healthCheck();
    const airtableHealth = await this.airtableService.healthCheck();
    
    return {
      ai_service: aiHealth,
      airtable: airtableHealth,
      overall: aiHealth && airtableHealth
    };
  }

  // Utility methods for testing and development
  async testFAQResponse(topic: string, propertyId?: string): Promise<AIResponse> {
    const message = `What is the ${topic} information?`;
    
    let context: AIRequestContext = {};
    if (propertyId) {
      const property = await this.airtableService.properties.getProperty(propertyId);
      context.property_context = property;
    }

    return this.openAIClient.processRequest(message, context);
  }

  async testBookingLookup(email: string): Promise<AIResponse> {
    const message = `I have a booking and my email is ${email}`;
    return this.openAIClient.processRequest(message, {});
  }
}