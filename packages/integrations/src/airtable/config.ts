import type { AirtableConfig } from '../types/airtable';

export function getAirtableConfig(): AirtableConfig {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY environment variable is required');
  }
  
  if (!baseId) {
    throw new Error('AIRTABLE_BASE_ID environment variable is required');
  }

  return {
    apiKey,
    baseId,
    tables: {
      properties: process.env.AIRTABLE_TABLE_PROPERTIES || 'Properties',
      bookings: process.env.AIRTABLE_TABLE_BOOKINGS || 'Bookings',
      communications: process.env.AIRTABLE_TABLE_COMMS || 'Comms',
      approvals: process.env.AIRTABLE_TABLE_APPROVALS || 'Approvals',
    },
  };
}

export const AIRTABLE_FIELD_MAPPINGS = {
  properties: {
    property_id: 'Property ID',
    name: 'Name',
    address: 'Address',
    wifi_ssid: 'WiFi SSID',
    wifi_password: 'WiFi Password',
    checkin_time: 'Check-in Time',
    checkout_time: 'Check-out Time',
    parking_instructions: 'Parking Instructions',
    access_instructions_public: 'Access Instructions (Public)',
    access_instructions_secure: 'Access Instructions (Secure)',
    house_rules: 'House Rules',
    faq_overrides: 'FAQ Overrides',
  },
  bookings: {
    booking_id: 'Booking ID',
    channel: 'Channel',
    guest_name: 'Guest Name',
    guest_email: 'Guest Email',
    guest_phone: 'Guest Phone',
    property_id: 'Property ID',
    arrival_date: 'Arrival Date',
    departure_date: 'Departure Date',
    num_guests: 'Number of Guests',
    pets: 'Pets',
    status: 'Status',
    notes: 'Notes',
  },
  communications: {
    comm_id: 'Comm ID',
    booking_id: 'Booking ID',
    direction: 'Direction',
    channel: 'Channel',
    subject: 'Subject',
    body: 'Body',
    draft: 'Draft',
    sent_at: 'Sent At',
    approved_by: 'Approved By',
    approved_at: 'Approved At',
    thread_id: 'Thread ID',
    from_address: 'From Address',
    to_address: 'To Address',
    in_reply_to: 'In Reply To',
  },
  approvals: {
    approval_id: 'Approval ID',
    type: 'Type',
    payload: 'Payload',
    status: 'Status',
    created_at: 'Created At',
    resolved_at: 'Resolved At',
    assignee: 'Assignee',
    comm_id: 'Comm ID',
    risk_flags: 'Risk Flags',
    confidence_score: 'Confidence Score',
    approval_url: 'Approval URL',
    reject_url: 'Reject URL',
  },
} as const;