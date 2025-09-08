import type { AirtableConfig } from '../types/airtable';
import type { Booking, Property, BookingContext } from '@ahh-ai/core';
import { AirtableClient } from './client';
import { PropertiesClient } from './properties';
import { BookingsClient } from './bookings';
import { CommunicationsClient } from './communications';
import { ApprovalsClient } from './approvals';

export class AirtableService {
  private client: AirtableClient;
  public readonly properties: PropertiesClient;
  public readonly bookings: BookingsClient;
  public readonly communications: CommunicationsClient;
  public readonly approvals: ApprovalsClient;

  constructor(config?: Partial<AirtableConfig>) {
    this.client = new AirtableClient(config);
    this.properties = new PropertiesClient(this.client);
    this.bookings = new BookingsClient(this.client);
    this.communications = new CommunicationsClient(this.client);
    this.approvals = new ApprovalsClient(this.client);
  }

  async healthCheck(): Promise<boolean> {
    return await this.client.healthCheck();
  }

  /**
   * Get full booking context including property details and previous communications
   */
  async getBookingContext(
    email?: string,
    name?: string,
    _phone?: string,
    arrivalDate?: Date
  ): Promise<BookingContext[]> {
    const contexts: BookingContext[] = [];
    let bookings: Booking[] = [];

    // Find bookings by email (primary method)
    if (email) {
      bookings = await this.bookings.findBookingsByEmail(email, arrivalDate);
    }

    // If no bookings found by email, try name
    if (bookings.length === 0 && name) {
      bookings = await this.bookings.findBookingsByName(name, arrivalDate);
    }

    // Build context for each booking
    for (const booking of bookings) {
      try {
        const property = await this.properties.getProperty(booking.property_id);
        const previous_comms = await this.communications.getCommunicationsByBooking(booking.booking_id);

        contexts.push({
          booking,
          property: property || undefined,
          previous_comms,
        });
      } catch (error) {
        console.error(`Error building context for booking ${booking.booking_id}:`, error);
        
        // Include booking even if we can't get property/comms
        contexts.push({
          booking,
          previous_comms: [],
        });
      }
    }

    return contexts;
  }

  /**
   * Verify guest identity against booking record
   */
  async verifyIdentity(
    bookingId: string,
    providedAnswers: {
      guest_name?: string;
      guest_email?: string;
      arrival_date?: string;
      property_name?: string;
    }
  ): Promise<{ verified: boolean; reason?: string }> {
    try {
      const booking = await this.bookings.getBookingById(bookingId);
      if (!booking) {
        return { verified: false, reason: 'Booking not found' };
      }

      // Check guest name
      if (providedAnswers.guest_name) {
        const providedName = providedAnswers.guest_name.toLowerCase().trim();
        const expectedName = booking.guest_name.toLowerCase().trim();
        if (providedName !== expectedName) {
          return { verified: false, reason: 'Name does not match booking record' };
        }
      }

      // Check guest email
      if (providedAnswers.guest_email) {
        const providedEmail = providedAnswers.guest_email.toLowerCase().trim();
        const expectedEmail = booking.guest_email.toLowerCase().trim();
        if (providedEmail !== expectedEmail) {
          return { verified: false, reason: 'Email does not match booking record' };
        }
      }

      // Check arrival date
      if (providedAnswers.arrival_date) {
        const providedDate = new Date(providedAnswers.arrival_date);
        const expectedDate = booking.arrival_date;
        if (providedDate.toDateString() !== expectedDate.toDateString()) {
          return { verified: false, reason: 'Arrival date does not match booking record' };
        }
      }

      // Check property name
      if (providedAnswers.property_name) {
        const property = await this.properties.getProperty(booking.property_id);
        if (!property) {
          return { verified: false, reason: 'Property information not available for verification' };
        }
        
        const providedPropertyName = providedAnswers.property_name.toLowerCase().trim();
        const expectedPropertyName = property.name.toLowerCase().trim();
        if (!expectedPropertyName.includes(providedPropertyName) && 
            !providedPropertyName.includes(expectedPropertyName)) {
          return { verified: false, reason: 'Property name does not match booking record' };
        }
      }

      return { verified: true };
    } catch (error) {
      console.error('Error verifying identity:', error);
      return { verified: false, reason: 'Unable to verify identity due to system error' };
    }
  }

  /**
   * Get property information with secure access details (requires verification)
   */
  async getPropertyWithSecureInfo(propertyId: string): Promise<Property | null> {
    return await this.properties.getProperty(propertyId);
  }

  /**
   * Get basic property information (no secure details)
   */
  async getPropertyPublicInfo(propertyId: string): Promise<Omit<Property, 'access_instructions_secure' | 'wifi_password'> | null> {
    const property = await this.properties.getProperty(propertyId);
    if (!property) {
      return null;
    }

    // Remove secure fields
    const { access_instructions_secure, wifi_password, ...publicProperty } = property;
    return publicProperty;
  }

  /**
   * Create a draft communication and approval queue entry
   */
  async createDraftWithApproval(
    draft: {
      booking_id?: string;
      subject?: string;
      body: string;
      to_address?: string;
      thread_id?: string;
    },
    approvalData: {
      type: 'reply' | 'verification' | 'policy' | 'escalation';
      risk_flags?: string[];
      confidence_score?: number;
      assignee?: string;
    }
  ): Promise<{ comm_id: string; approval_id: string }> {
    // Create draft communication
    const comm_id = await this.communications.createCommunication({
      booking_id: draft.booking_id,
      direction: 'outbound',
      channel: 'email',
      subject: draft.subject,
      body: draft.body,
      draft: true,
      to_address: draft.to_address,
      thread_id: draft.thread_id,
    });

    // Create approval queue entry
    const approval_id = await this.approvals.createApproval({
      type: approvalData.type,
      payload: {
        draft_reply: draft.body,
        booking_context: draft.booking_id ? {
          booking_id: draft.booking_id,
        } : undefined,
      },
      status: 'pending',
      comm_id,
      risk_flags: approvalData.risk_flags as any,
      confidence_score: approvalData.confidence_score,
      assignee: approvalData.assignee,
    });

    return { comm_id, approval_id };
  }
}