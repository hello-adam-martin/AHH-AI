import type { RiskFlag } from '@ahh-ai/core';

export interface AIResponse {
  message: string;
  confidence: number;
  tool_calls?: ToolCall[];
  risk_flags: RiskFlag[];
  requires_approval: boolean;
  reasoning?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  success: boolean;
  error?: string;
}

export interface ProcessedRequest {
  original_message: string;
  detected_intent: string;
  extracted_entities: {
    guest_name?: string;
    email?: string;
    arrival_date?: string;
    property_name?: string;
    topics?: string[];
  };
  requires_identity_verification: boolean;
  emergency_detected: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AIRequestContext {
  booking_context?: any;
  property_context?: any;
  conversation_history?: any[];
  user_verified?: boolean;
}

export interface SafetyCheck {
  passed: boolean;
  violations: string[];
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}