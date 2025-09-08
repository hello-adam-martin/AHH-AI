export type CommDirection = 'inbound' | 'outbound';
export type CommChannel = 'email' | 'sms';

export interface Communication {
  comm_id: string;
  booking_id?: string;
  direction: CommDirection;
  channel: CommChannel;
  subject?: string;
  body: string;
  draft: boolean;
  sent_at?: Date;
  approved_by?: string;
  approved_at?: Date;
  thread_id?: string;
  from_address?: string;
  to_address?: string;
  in_reply_to?: string;
  references?: string[];
}

export interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  thread_id?: string;
  message_id: string;
  received_at: Date;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content_type: string;
  size: number;
  content?: Buffer;
}