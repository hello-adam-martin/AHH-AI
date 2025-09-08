import type { Booking, BookingStatus, BookingChannel } from '@ahh-ai/core';
import type { AirtableRecord } from '../types/airtable';
import { AirtableClient } from './client';
import { AIRTABLE_FIELD_MAPPINGS } from './config';
import { sanitizeEmail } from '@ahh-ai/core';

interface AirtableBooking {
  [key: string]: any;
}

export class BookingsClient {
  constructor(private client: AirtableClient) {}

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const tableName = this.client.getTableName('bookings');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.bookings.booking_id}} = "${bookingId}"`;
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      return null;
    }

    return this.mapFromAirtable(records[0]);
  }

  async findBookingsByEmail(email: string, arrivalDate?: Date): Promise<Booking[]> {
    const tableName = this.client.getTableName('bookings');
    const sanitizedEmail = sanitizeEmail(email);
    
    let filterFormula = `LOWER({${AIRTABLE_FIELD_MAPPINGS.bookings.guest_email}}) = "${sanitizedEmail}"`;
    
    if (arrivalDate) {
      const dateStr = arrivalDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      filterFormula += ` AND {${AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date}} = "${dateStr}"`;
    }
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date, direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async findBookingsByName(guestName: string, arrivalDate?: Date): Promise<Booking[]> {
    const tableName = this.client.getTableName('bookings');
    
    let filterFormula = `SEARCH(UPPER("${guestName.toUpperCase()}"), UPPER({${AIRTABLE_FIELD_MAPPINGS.bookings.guest_name}}))`;
    
    if (arrivalDate) {
      const dateStr = arrivalDate.toISOString().split('T')[0];
      filterFormula += ` AND {${AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date}} = "${dateStr}"`;
    }
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date, direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async findBookingsByProperty(propertyId: string, dateRange?: { start: Date; end: Date }): Promise<Booking[]> {
    const tableName = this.client.getTableName('bookings');
    
    let filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.bookings.property_id}} = "${propertyId}"`;
    
    if (dateRange) {
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];
      filterFormula += ` AND {${AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date}} >= "${startStr}" AND {${AIRTABLE_FIELD_MAPPINGS.bookings.departure_date}} <= "${endStr}"`;
    }
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date, direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getUpcomingBookings(daysAhead: number = 7): Promise<Booking[]> {
    const tableName = this.client.getTableName('bookings');
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const filterFormula = `AND({${AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date}} >= "${todayStr}", {${AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date}} <= "${futureDateStr}", {${AIRTABLE_FIELD_MAPPINGS.bookings.status}} = "confirmed")`;
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.bookings.arrival_date, direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async createBooking(booking: Omit<Booking, 'booking_id'>): Promise<string> {
    const tableName = this.client.getTableName('bookings');
    const airtableFields = this.mapToAirtable(booking);
    
    return await this.client.createRecord(tableName, airtableFields);
  }

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    const tableName = this.client.getTableName('bookings');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.bookings.booking_id}} = "${bookingId}"`;
    
    const records = await this.client.findRecords<AirtableBooking>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const airtableFields = this.mapToAirtable(updates);
    await this.client.updateRecord(tableName, records[0].id, airtableFields);
  }

  private mapFromAirtable(record: AirtableRecord<AirtableBooking>): Booking {
    const fields = record.fields;
    const mapping = AIRTABLE_FIELD_MAPPINGS.bookings;

    return {
      booking_id: fields[mapping.booking_id] || record.id,
      channel: (fields[mapping.channel] || 'Direct') as BookingChannel,
      guest_name: fields[mapping.guest_name] || '',
      guest_email: fields[mapping.guest_email] || '',
      guest_phone: fields[mapping.guest_phone],
      property_id: fields[mapping.property_id] || '',
      arrival_date: new Date(fields[mapping.arrival_date] || Date.now()),
      departure_date: new Date(fields[mapping.departure_date] || Date.now()),
      num_guests: Number(fields[mapping.num_guests]) || 1,
      pets: Boolean(fields[mapping.pets]),
      status: (fields[mapping.status] || 'confirmed') as BookingStatus,
      notes: fields[mapping.notes],
    };
  }

  private mapToAirtable(booking: Partial<Booking>): Partial<AirtableBooking> {
    const mapping = AIRTABLE_FIELD_MAPPINGS.bookings;
    const fields: Partial<AirtableBooking> = {};

    if (booking.booking_id !== undefined) fields[mapping.booking_id] = booking.booking_id;
    if (booking.channel !== undefined) fields[mapping.channel] = booking.channel;
    if (booking.guest_name !== undefined) fields[mapping.guest_name] = booking.guest_name;
    if (booking.guest_email !== undefined) fields[mapping.guest_email] = booking.guest_email;
    if (booking.guest_phone !== undefined) fields[mapping.guest_phone] = booking.guest_phone;
    if (booking.property_id !== undefined) fields[mapping.property_id] = booking.property_id;
    if (booking.arrival_date !== undefined) fields[mapping.arrival_date] = booking.arrival_date.toISOString().split('T')[0];
    if (booking.departure_date !== undefined) fields[mapping.departure_date] = booking.departure_date.toISOString().split('T')[0];
    if (booking.num_guests !== undefined) fields[mapping.num_guests] = booking.num_guests;
    if (booking.pets !== undefined) fields[mapping.pets] = booking.pets;
    if (booking.status !== undefined) fields[mapping.status] = booking.status;
    if (booking.notes !== undefined) fields[mapping.notes] = booking.notes;

    return fields;
  }
}