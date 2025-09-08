import { ESCALATION_KEYWORDS, SECURE_INFO_TYPES, CONFIDENCE_THRESHOLD } from '../constants';
import type { RiskFlag } from '../types/approval';

export interface GuardrailCheck {
  passed: boolean;
  reason?: string;
  risk_flags: RiskFlag[];
  confidence: number;
}

export function checkForEscalationKeywords(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  return ESCALATION_KEYWORDS.filter(keyword => 
    lowercaseText.includes(keyword.toLowerCase())
  );
}

export function checkForSecureInfoRequest(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  return SECURE_INFO_TYPES.filter(infoType => 
    lowercaseText.includes(infoType.toLowerCase().replace(/_/g, ' '))
  );
}

export function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const negativeWords = ['angry', 'upset', 'disappointed', 'terrible', 'awful', 'horrible', 'unacceptable'];
  const positiveWords = ['thank', 'great', 'wonderful', 'excellent', 'amazing', 'lovely', 'perfect'];
  
  const lowercaseText = text.toLowerCase();
  const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;
  const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
  
  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount > negativeCount) return 'positive';
  return 'neutral';
}

export function performGuardrailChecks(
  requestText: string,
  responseText: string,
  confidence: number
): GuardrailCheck {
  const risk_flags: RiskFlag[] = [];
  let shouldEscalate = false;
  let reason = '';

  const escalationKeywords = checkForEscalationKeywords(requestText);
  if (escalationKeywords.length > 0) {
    risk_flags.push('emergency_keywords');
    shouldEscalate = true;
    reason = `Emergency keywords detected: ${escalationKeywords.join(', ')}`;
  }

  const secureInfoRequested = checkForSecureInfoRequest(responseText);
  if (secureInfoRequested.length > 0) {
    risk_flags.push('sensitive_info_requested');
    shouldEscalate = true;
    reason = `Attempting to share secure information: ${secureInfoRequested.join(', ')}`;
  }

  const sentiment = analyzeSentiment(requestText);
  if (sentiment === 'negative') {
    risk_flags.push('negative_sentiment');
  }

  if (confidence < CONFIDENCE_THRESHOLD) {
    risk_flags.push('low_confidence');
    shouldEscalate = true;
    reason = `Low confidence score: ${confidence.toFixed(2)}`;
  }

  if (requestText.toLowerCase().includes('refund') || requestText.toLowerCase().includes('discount')) {
    risk_flags.push('refund_request');
    shouldEscalate = true;
    reason = 'Refund or discount request detected';
  }

  return {
    passed: !shouldEscalate,
    reason,
    risk_flags,
    confidence,
  };
}

export function sanitizeResponse(text: string): string {
  const patterns = [
    /\b\d{4,}\b/g,
    /\baccess code:?\s*\d+/gi,
    /\blockbox:?\s*\d+/gi,
    /\bpin:?\s*\d+/gi,
    /\bpassword:?\s*\w+/gi,
  ];
  
  let sanitized = text;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

export function validateIdentityAnswers(
  providedAnswers: Record<string, string>,
  expectedAnswers: Record<string, string>
): boolean {
  const requiredFields = ['guest_name', 'arrival_date'];
  
  for (const field of requiredFields) {
    if (!providedAnswers[field] || !expectedAnswers[field]) {
      return false;
    }
    
    const provided = providedAnswers[field].toLowerCase().trim();
    const expected = expectedAnswers[field].toLowerCase().trim();
    
    if (field === 'arrival_date') {
      const providedDate = new Date(provided);
      const expectedDate = new Date(expected);
      if (providedDate.toDateString() !== expectedDate.toDateString()) {
        return false;
      }
    } else if (provided !== expected) {
      return false;
    }
  }
  
  return true;
}