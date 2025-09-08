import type { ToolCall } from '../types';
import type { AirtableService } from '@ahh-ai/integrations';
import { configManager } from '@ahh-ai/config';
// import { generateCorrelationId } from '@ahh-ai/core';

export class ToolHandlers {
  constructor(
    private airtableService: AirtableService,
    private emailService?: any // Will be implemented later
  ) {}

  async executeToolCall(toolCall: ToolCall): Promise<ToolCall> {
    try {
      let result: any;

      switch (toolCall.name) {
        case 'get_booking_context':
          result = await this.getBookingContext(toolCall.arguments);
          break;

        case 'get_property_faq':
          result = await this.getPropertyFaq(toolCall.arguments);
          break;

        case 'verify_identity':
          result = await this.verifyIdentity(toolCall.arguments);
          break;

        case 'create_draft_reply':
          result = await this.createDraftReply(toolCall.arguments);
          break;

        case 'enqueue_for_approval':
          result = await this.enqueueForApproval(toolCall.arguments);
          break;

        case 'send_email':
          result = await this.sendEmail(toolCall.arguments);
          break;

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      return {
        ...toolCall,
        result,
        success: true,
      };
    } catch (error) {
      return {
        ...toolCall,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getBookingContext(args: any) {
    const { email, name, phone, arrival_date } = args;
    
    let arrivalDate: Date | undefined;
    if (arrival_date) {
      arrivalDate = new Date(arrival_date);
    }

    const contexts = await this.airtableService.getBookingContext(
      email,
      name, 
      phone,
      arrivalDate
    );

    if (contexts.length === 0) {
      return {
        found: false,
        message: 'No booking found matching the provided information'
      };
    }

    // Return booking info but mask sensitive details
    return {
      found: true,
      bookings: contexts.map(ctx => ({
        booking_id: ctx.booking.booking_id,
        guest_name: ctx.booking.guest_name,
        property_name: ctx.property?.name,
        arrival_date: ctx.booking.arrival_date.toISOString().split('T')[0],
        departure_date: ctx.booking.departure_date.toISOString().split('T')[0],
        num_guests: ctx.booking.num_guests,
        status: ctx.booking.status,
        // Don't include sensitive property details here
        property_public_info: ctx.property ? {
          name: ctx.property.name,
          checkin_time: ctx.property.checkin_time,
          checkout_time: ctx.property.checkout_time,
          parking_instructions: ctx.property.parking_instructions,
          access_instructions_public: ctx.property.access_instructions_public,
          house_rules: ctx.property.house_rules,
        } : null,
        previous_communications: ctx.previous_comms?.length || 0
      }))
    };
  }

  private async getPropertyFaq(args: any) {
    const { property_id, topic } = args;
    
    const faqResult = await configManager.getPropertyFAQ(property_id, topic);
    
    if (!faqResult) {
      return {
        found: false,
        message: `No FAQ found for topic '${topic}'`
      };
    }

    return {
      found: true,
      topic: faqResult.topic,
      answer: faqResult.answer,
      source: faqResult.source,
      property_specific: faqResult.source === 'property_override'
    };
  }

  private async verifyIdentity(args: any) {
    const { booking_id, provided_answers } = args;
    
    const verification = await this.airtableService.verifyIdentity(
      booking_id,
      provided_answers
    );

    return verification;
  }

  private async createDraftReply(args: any) {
    const { thread_id, text, booking_id, to_address, subject } = args;
    
    const { comm_id, approval_id } = await this.airtableService.createDraftWithApproval(
      {
        booking_id,
        subject,
        body: text,
        to_address,
        thread_id,
      },
      {
        type: 'reply',
        confidence_score: args.confidence_score || 0.75,
        risk_flags: args.risk_flags || [],
      }
    );

    return {
      draft_created: true,
      comm_id,
      approval_id,
      message: 'Draft reply created and queued for approval'
    };
  }

  private async enqueueForApproval(args: any) {
    const { type, payload, reason, risk_flags, confidence_score } = args;
    
    const approval_id = await this.airtableService.approvals.createApproval({
      type,
      payload,
      status: 'pending',
      risk_flags: risk_flags || [],
      confidence_score,
    });

    // Log the escalation
    console.log(`Escalation created: ${approval_id} - ${reason}`);

    return {
      queued: true,
      approval_id,
      reason,
      message: 'Request queued for human approval'
    };
  }

  private async sendEmail(args: any) {
    // In Phase 1, we're in draft-only mode, so this should not be called
    // But we'll implement it for completeness
    
    if (!this.emailService) {
      throw new Error('Email service not available - draft mode is enabled');
    }

    const { to, subject, html_body, in_reply_to, thread_id } = args;
    console.log('Send email args:', { to, subject, html_body, in_reply_to, thread_id });

    // This would integrate with the email service when implemented
    throw new Error('Auto-send mode is disabled. All responses must go through approval queue.');
  }

  async getSecurePropertyInfo(propertyId: string, _verifiedBookingId: string) {
    // This method provides access to secure info only after verification
    const property = await this.airtableService.getPropertyWithSecureInfo(propertyId);
    
    if (!property) {
      return null;
    }

    // Log access to secure information
    console.log(`Secure property info accessed for ${propertyId} by verified booking ${_verifiedBookingId}`);

    return {
      access_instructions_secure: property.access_instructions_secure,
      wifi_password: property.wifi_password,
    };
  }
}