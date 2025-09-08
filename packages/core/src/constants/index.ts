export const CONFIDENCE_THRESHOLD = 0.75;
export const DEFAULT_CHECKIN_TIME = '3:00 PM';
export const DEFAULT_CHECKOUT_TIME = '10:00 AM';

export const ESCALATION_KEYWORDS = [
  'locked out',
  'gas',
  'fire',
  'water leak',
  'medical',
  'emergency',
  'refund',
  'discount',
  'angry',
  'lawsuit',
  'compensation',
  'police',
  'lawyer',
  'injured',
  'hospital',
] as const;

export const SECURE_INFO_TYPES = [
  'access_instructions_secure',
  'lockbox_code',
  'door_code',
  'alarm_code',
  'wifi_password',
  'gate_code',
] as const;

export const FAQ_TOPICS = [
  'wifi',
  'checkin',
  'checkout',
  'parking',
  'rubbish',
  'heating',
  'tv',
  'directions',
  'amenities',
  'house_rules',
  'pets',
  'smoking',
  'noise',
  'emergency',
] as const;

export const APPROVAL_QUEUE_SETTINGS = {
  DRAFT_MODE_DEFAULT: true,
  AUTO_APPROVE_CONFIDENCE: 0.95,
  MAX_AUTO_REPLIES_PER_HOUR: 10,
  REQUIRE_APPROVAL_FOR_FIRST_CONTACT: true,
} as const;

export const IDENTITY_VERIFICATION = {
  MAX_ATTEMPTS: 3,
  REQUIRED_FIELDS: ['guest_name', 'arrival_date'],
  LOCKOUT_DURATION_MINUTES: 30,
} as const;

export const EMAIL_SETTINGS = {
  POLL_INTERVAL_SECONDS: 120,
  MAX_EMAIL_LENGTH: 10000,
  MAX_SUBJECT_LENGTH: 200,
  SENDER_NAME: 'Akaroa Holiday Homes',
  SENDER_EMAIL: 'hello@akaroaholidayhomes.nz',
} as const;