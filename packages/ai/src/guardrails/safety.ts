import type { SafetyCheck, ProcessedRequest } from '../types';
import type { RiskFlag } from '@ahh-ai/core';
import { performGuardrailChecks } from '@ahh-ai/core';
import { configManager } from '@ahh-ai/config';

export class SafetyManager {
  async checkRequestSafety(request: string): Promise<SafetyCheck> {
    const violations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for emergency keywords
    const isEmergency = await configManager.isEscalationKeyword(request);
    if (isEmergency) {
      violations.push('Emergency keywords detected');
      riskLevel = 'high';
    }

    // Check for policy violations
    const policies = await configManager.getPolicyConfig();
    for (const redLine of policies.red_lines) {
      if (request.toLowerCase().includes(redLine.toLowerCase().split(' ')[0])) {
        violations.push(`Policy violation: ${redLine}`);
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // Check for refund/discount requests
    const refundKeywords = ['refund', 'discount', 'compensation', 'money back'];
    if (refundKeywords.some(keyword => request.toLowerCase().includes(keyword))) {
      violations.push('Financial request detected');
      riskLevel = 'medium';
    }

    return {
      passed: violations.length === 0,
      violations,
      risk_level: riskLevel,
      confidence: violations.length === 0 ? 0.9 : 0.3
    };
  }

  async validateResponse(
    request: string, 
    response: string, 
    confidence: number
  ): Promise<{ safe: boolean; risk_flags: RiskFlag[]; reason?: string }> {
    
    const guardrailCheck = performGuardrailChecks(request, response, confidence);
    
    if (!guardrailCheck.passed) {
      return {
        safe: false,
        risk_flags: guardrailCheck.risk_flags,
        reason: guardrailCheck.reason
      };
    }

    // Additional checks for secure information leakage
    const securePatterns = [
      /\b\d{4,6}\b/, // Potential access codes
      /password:\s*\w+/i,
      /code:\s*\d+/i,
      /key:\s*\w+/i
    ];

    for (const pattern of securePatterns) {
      if (pattern.test(response)) {
        return {
          safe: false,
          risk_flags: ['sensitive_info_requested'],
          reason: 'Response contains potentially sensitive information'
        };
      }
    }

    return {
      safe: true,
      risk_flags: guardrailCheck.risk_flags
    };
  }

  async shouldRequireApproval(
    confidence: number,
    riskFlags: RiskFlag[],
    isFirstContact: boolean = false
  ): Promise<{ required: boolean; reason: string }> {
    
    const thresholds = await configManager.getConfidenceThresholds();
    const settings = await configManager.getApprovalSettings();

    // Always require approval for first contact if enabled
    if (isFirstContact && settings.require_approval_first_contact) {
      return {
        required: true,
        reason: 'First contact with guest requires approval'
      };
    }

    // Require approval for low confidence
    if (confidence < thresholds.approval_required) {
      return {
        required: true,
        reason: `Low confidence score: ${confidence.toFixed(2)}`
      };
    }

    // Require approval for high-risk flags
    const highRiskFlags = ['emergency_keywords', 'policy_violation', 'sensitive_info_requested'];
    const hasHighRisk = riskFlags.some(flag => highRiskFlags.includes(flag));
    
    if (hasHighRisk) {
      return {
        required: true,
        reason: `High-risk flags detected: ${riskFlags.join(', ')}`
      };
    }

    // Auto-approve only for very high confidence
    if (confidence >= thresholds.auto_reply && settings.draft_mode_default === false) {
      return {
        required: false,
        reason: 'High confidence and auto-send enabled'
      };
    }

    // Default to requiring approval (draft mode)
    return {
      required: true,
      reason: 'Draft mode enabled - all responses require approval'
    };
  }

  processIncomingRequest(message: string): ProcessedRequest {
    // Simple intent detection
    const lowerMessage = message.toLowerCase();
    let detectedIntent = 'general_inquiry';
    
    if (lowerMessage.includes('wifi') || lowerMessage.includes('password')) {
      detectedIntent = 'wifi_request';
    } else if (lowerMessage.includes('check') && (lowerMessage.includes('in') || lowerMessage.includes('out'))) {
      detectedIntent = 'checkin_checkout_info';
    } else if (lowerMessage.includes('direction') || lowerMessage.includes('address') || lowerMessage.includes('location')) {
      detectedIntent = 'directions_request';
    } else if (lowerMessage.includes('access') || lowerMessage.includes('code') || lowerMessage.includes('key')) {
      detectedIntent = 'access_request';
    }

    // Extract entities (basic implementation)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/g;
    
    const emails = message.match(emailRegex);
    const dates = message.match(dateRegex);

    // Detect if identity verification is needed
    const requiresVerification = detectedIntent === 'access_request' || 
                                lowerMessage.includes('secure') ||
                                lowerMessage.includes('lockbox') ||
                                lowerMessage.includes('door code');

    // Emergency detection
    const emergencyKeywords = ['emergency', 'fire', 'gas', 'medical', 'locked out', 'urgent'];
    const emergencyDetected = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));

    // Sentiment analysis (basic)
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'complaint'];
    const positiveWords = ['thank', 'great', 'wonderful', 'lovely', 'perfect'];
    
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (negativeCount > positiveCount) sentiment = 'negative';
    else if (positiveCount > negativeCount) sentiment = 'positive';

    return {
      original_message: message,
      detected_intent: detectedIntent,
      extracted_entities: {
        email: emails?.[0],
        arrival_date: dates?.[0],
      },
      requires_identity_verification: requiresVerification,
      emergency_detected: emergencyDetected,
      sentiment
    };
  }
}