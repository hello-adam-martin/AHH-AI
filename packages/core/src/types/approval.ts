export type ApprovalType = 'reply' | 'verification' | 'policy' | 'escalation';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  approval_id: string;
  type: ApprovalType;
  payload: ApprovalPayload;
  status: ApprovalStatus;
  created_at: Date;
  resolved_at?: Date;
  assignee?: string;
  comm_id?: string;
  risk_flags?: RiskFlag[];
  confidence_score?: number;
  approval_url?: string;
  reject_url?: string;
}

export interface ApprovalPayload {
  draft_reply?: string;
  detected_topics?: string[];
  booking_context?: {
    booking_id?: string;
    guest_name?: string;
    property_name?: string;
  };
  verification_details?: {
    info_requested: string[];
    verification_status: 'pending' | 'failed' | 'passed';
  };
  escalation_reason?: string;
}

export type RiskFlag = 
  | 'policy_violation'
  | 'identity_unverified'
  | 'sensitive_info_requested'
  | 'negative_sentiment'
  | 'emergency_keywords'
  | 'refund_request'
  | 'low_confidence';