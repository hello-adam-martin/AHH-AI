import { z } from 'zod';

export const PropertySchema = z.object({
  property_id: z.string(),
  name: z.string(),
  address: z.string(),
  wifi_ssid: z.string().optional(),
  wifi_password: z.string().optional(),
  checkin_time: z.string(),
  checkout_time: z.string(),
  parking_instructions: z.string().optional(),
  access_instructions_public: z.string().optional(),
  access_instructions_secure: z.string().optional(),
  house_rules: z.string().optional(),
  faq_overrides: z.record(z.string()).optional(),
});

export const BookingSchema = z.object({
  booking_id: z.string(),
  channel: z.enum(['Airbnb', 'Direct', 'Booking.com']),
  guest_name: z.string(),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  property_id: z.string(),
  arrival_date: z.coerce.date(),
  departure_date: z.coerce.date(),
  num_guests: z.number().positive(),
  pets: z.boolean().optional(),
  status: z.enum(['confirmed', 'cancelled', 'pending']),
  notes: z.string().optional(),
});

export const CommunicationSchema = z.object({
  comm_id: z.string(),
  booking_id: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['email', 'sms']),
  subject: z.string().optional(),
  body: z.string(),
  draft: z.boolean(),
  sent_at: z.coerce.date().optional(),
  approved_by: z.string().optional(),
  approved_at: z.coerce.date().optional(),
  thread_id: z.string().optional(),
  from_address: z.string().optional(),
  to_address: z.string().optional(),
});

export const ApprovalSchema = z.object({
  approval_id: z.string(),
  type: z.enum(['reply', 'verification', 'policy', 'escalation']),
  payload: z.record(z.any()),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.coerce.date(),
  resolved_at: z.coerce.date().optional(),
  assignee: z.string().optional(),
  comm_id: z.string().optional(),
  risk_flags: z.array(z.string()).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

export const InboundEmailSchema = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
  thread_id: z.string().optional(),
  message_id: z.string(),
  received_at: z.coerce.date(),
});

export type PropertyInput = z.infer<typeof PropertySchema>;
export type BookingInput = z.infer<typeof BookingSchema>;
export type CommunicationInput = z.infer<typeof CommunicationSchema>;
export type ApprovalInput = z.infer<typeof ApprovalSchema>;
export type InboundEmailInput = z.infer<typeof InboundEmailSchema>;