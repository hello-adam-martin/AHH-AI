export interface PolicyConfig {
  identity_verification: {
    required_for: string[];
    steps: string[];
  };
  red_lines: string[];
  escalation: {
    triggers: string[];
    emergency_keywords: string[];
  };
  defaults: {
    checkin_time: string;
    checkout_time: string;
    max_guests_default: number;
    pet_policy: string;
    smoking_policy: string;
    party_policy: string;
  };
  confidence_thresholds: {
    auto_reply: number;
    approval_required: number;
    escalate_immediately: number;
  };
  approval_settings: {
    draft_mode_default: boolean;
    require_approval_first_contact: boolean;
    max_auto_replies_per_hour: number;
    approval_timeout_hours: number;
  };
}

export interface FAQConfig {
  defaults: Record<string, string>;
  per_property_overrides: Record<string, Record<string, string>>;
}

export interface PromptConfig {
  system: string;
  tools: string;
}

export interface AppConfig {
  policies: PolicyConfig;
  faqs: FAQConfig;
  prompts: PromptConfig;
}

export interface PropertyFAQResult {
  topic: string;
  answer: string;
  source: 'default' | 'property_override';
  property_id?: string;
}