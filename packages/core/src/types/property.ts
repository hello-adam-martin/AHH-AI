export interface Property {
  property_id: string;
  name: string;
  address: string;
  wifi_ssid?: string;
  wifi_password?: string;
  checkin_time: string;
  checkout_time: string;
  parking_instructions?: string;
  access_instructions_public?: string;
  access_instructions_secure?: string;
  house_rules?: string;
  faq_overrides?: Record<string, string>;
}

export interface PropertyFAQ {
  property_id: string;
  topic: string;
  answer: string;
  is_override: boolean;
}