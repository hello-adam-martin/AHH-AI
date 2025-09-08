export interface ProcessEmailRequest {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  thread_id?: string;
  message_id?: string;
  received_at?: string;
}

export interface ProcessEmailResponse {
  success: boolean;
  message: string;
  ai_response?: {
    message: string;
    confidence: number;
    requires_approval: boolean;
    risk_flags: string[];
    reasoning?: string;
  };
  comm_id?: string;
  approval_id?: string;
  error?: string;
}

export interface ApprovalActionRequest {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}