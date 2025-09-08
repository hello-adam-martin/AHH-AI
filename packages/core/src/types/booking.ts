export type BookingChannel = 'Airbnb' | 'Direct' | 'Booking.com';
export type BookingStatus = 'confirmed' | 'cancelled' | 'pending';

export interface Booking {
  booking_id: string;
  channel: BookingChannel;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  property_id: string;
  arrival_date: Date;
  departure_date: Date;
  num_guests: number;
  pets?: boolean;
  status: BookingStatus;
  notes?: string;
}

export interface BookingContext {
  booking: Booking;
  property?: Property;
  previous_comms?: Communication[];
}

import type { Property } from './property';
import type { Communication } from './communication';