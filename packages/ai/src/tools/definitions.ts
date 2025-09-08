import type { ToolDefinition } from '../types';

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  get_booking_context: {
    name: 'get_booking_context',
    description: 'Retrieve booking information and context for a guest using their email, name, phone, or arrival date',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Guest email address'
        },
        name: {
          type: 'string', 
          description: 'Guest full name'
        },
        phone: {
          type: 'string',
          description: 'Guest phone number'
        },
        arrival_date: {
          type: 'string',
          description: 'Expected arrival date in YYYY-MM-DD format'
        }
      },
      required: []
    }
  },

  get_property_faq: {
    name: 'get_property_faq',
    description: 'Get FAQ answer for a specific topic, with property-specific overrides if available',
    parameters: {
      type: 'object',
      properties: {
        property_id: {
          type: 'string',
          description: 'Property ID to get specific FAQ answers for'
        },
        topic: {
          type: 'string',
          description: 'FAQ topic to look up',
          enum: [
            'wifi', 'checkin', 'checkout', 'parking', 'rubbish', 'heating', 
            'tv', 'directions', 'amenities', 'emergency', 'pets', 'smoking', 
            'noise', 'cleaning', 'laundry'
          ]
        }
      },
      required: ['topic']
    }
  },

  verify_identity: {
    name: 'verify_identity',
    description: 'Verify guest identity against booking record before sharing secure information',
    parameters: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'Booking ID to verify against'
        },
        provided_answers: {
          type: 'object',
          description: 'Guest-provided answers for verification'
        }
      },
      required: ['booking_id', 'provided_answers']
    }
  },

  create_draft_reply: {
    name: 'create_draft_reply',
    description: 'Create a draft reply for human approval before sending',
    parameters: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'Email thread ID for conversation continuity'
        },
        text: {
          type: 'string',
          description: 'Draft reply text'
        },
        booking_id: {
          type: 'string',
          description: 'Related booking ID if applicable'
        },
        to_address: {
          type: 'string',
          description: 'Recipient email address'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        }
      },
      required: ['text']
    }
  },

  enqueue_for_approval: {
    name: 'enqueue_for_approval',
    description: 'Add request to approval queue for human review when uncertain or policy violations detected',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of approval needed',
          enum: ['reply', 'verification', 'policy', 'escalation']
        },
        payload: {
          type: 'object',
          description: 'Approval request details'
        },
        reason: {
          type: 'string',
          description: 'Reason for requiring approval'
        },
        risk_flags: {
          type: 'array',
          description: 'Detected risk flags'
        },
        confidence_score: {
          type: 'number',
          description: 'AI confidence score (0-1)'
        }
      },
      required: ['type', 'payload', 'reason']
    }
  },

  send_email: {
    name: 'send_email',
    description: 'Send email response (only when auto-send mode is enabled, otherwise use create_draft_reply)',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address'
        },
        subject: {
          type: 'string',
          description: 'Email subject'
        },
        html_body: {
          type: 'string',
          description: 'Email body in HTML format'
        },
        in_reply_to: {
          type: 'string',
          description: 'Message ID of email being replied to'
        },
        thread_id: {
          type: 'string',
          description: 'Email thread ID for conversation continuity'
        }
      },
      required: ['to', 'subject', 'html_body']
    }
  }
};

export const TOOL_NAMES = Object.keys(TOOL_DEFINITIONS);
export type ToolName = keyof typeof TOOL_DEFINITIONS;