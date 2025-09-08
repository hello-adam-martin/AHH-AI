import type { Communication, CommDirection, CommChannel } from '@ahh-ai/core';
import type { AirtableRecord } from '../types/airtable';
import { AirtableClient } from './client';
import { AIRTABLE_FIELD_MAPPINGS } from './config';
import { generateCorrelationId } from '@ahh-ai/core';

interface AirtableCommunication {
  [key: string]: any;
}

export class CommunicationsClient {
  constructor(private client: AirtableClient) {}

  async createCommunication(communication: Omit<Communication, 'comm_id'>): Promise<string> {
    const tableName = this.client.getTableName('communications');
    const commWithId: Communication = {
      ...communication,
      comm_id: generateCorrelationId(),
    };
    
    const airtableFields = this.mapToAirtable(commWithId);
    await this.client.createRecord(tableName, airtableFields);
    
    return commWithId.comm_id;
  }

  async getCommunication(commId: string): Promise<Communication | null> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.comm_id}} = "${commId}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      return null;
    }

    return this.mapFromAirtable(records[0]);
  }

  async getCommunicationsByBooking(bookingId: string): Promise<Communication[]> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.booking_id}} = "${bookingId}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.communications.sent_at || 'Created Time', direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getCommunicationsByThread(threadId: string): Promise<Communication[]> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.thread_id}} = "${threadId}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.communications.sent_at || 'Created Time', direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getDraftCommunications(): Promise<Communication[]> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.draft}} = TRUE()`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: 'Created Time', direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async markCommunicationSent(commId: string, sentAt?: Date): Promise<void> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.comm_id}} = "${commId}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Communication not found: ${commId}`);
    }

    const updateFields = {
      [AIRTABLE_FIELD_MAPPINGS.communications.draft]: false,
      [AIRTABLE_FIELD_MAPPINGS.communications.sent_at]: (sentAt || new Date()).toISOString(),
    };

    await this.client.updateRecord(tableName, records[0].id, updateFields);
  }

  async approveCommunication(commId: string, approvedBy: string): Promise<void> {
    const tableName = this.client.getTableName('communications');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.communications.comm_id}} = "${commId}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Communication not found: ${commId}`);
    }

    const updateFields = {
      [AIRTABLE_FIELD_MAPPINGS.communications.approved_by]: approvedBy,
      [AIRTABLE_FIELD_MAPPINGS.communications.approved_at]: new Date().toISOString(),
    };

    await this.client.updateRecord(tableName, records[0].id, updateFields);
  }

  async getRecentCommunications(hours: number = 24): Promise<Communication[]> {
    const tableName = this.client.getTableName('communications');
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const cutoffStr = cutoffTime.toISOString();
    
    const filterFormula = `CREATED_TIME() >= "${cutoffStr}"`;
    
    const records = await this.client.findRecords<AirtableCommunication>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: 'Created Time', direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  private mapFromAirtable(record: AirtableRecord<AirtableCommunication>): Communication {
    const fields = record.fields;
    const mapping = AIRTABLE_FIELD_MAPPINGS.communications;

    return {
      comm_id: fields[mapping.comm_id] || record.id,
      booking_id: fields[mapping.booking_id],
      direction: (fields[mapping.direction] || 'inbound') as CommDirection,
      channel: (fields[mapping.channel] || 'email') as CommChannel,
      subject: fields[mapping.subject],
      body: fields[mapping.body] || '',
      draft: Boolean(fields[mapping.draft]),
      sent_at: fields[mapping.sent_at] ? new Date(fields[mapping.sent_at]) : undefined,
      approved_by: fields[mapping.approved_by],
      approved_at: fields[mapping.approved_at] ? new Date(fields[mapping.approved_at]) : undefined,
      thread_id: fields[mapping.thread_id],
      from_address: fields[mapping.from_address],
      to_address: fields[mapping.to_address],
      in_reply_to: fields[mapping.in_reply_to],
    };
  }

  private mapToAirtable(communication: Communication): Partial<AirtableCommunication> {
    const mapping = AIRTABLE_FIELD_MAPPINGS.communications;
    const fields: Partial<AirtableCommunication> = {};

    fields[mapping.comm_id] = communication.comm_id;
    fields[mapping.direction] = communication.direction;
    fields[mapping.channel] = communication.channel;
    fields[mapping.body] = communication.body;
    fields[mapping.draft] = communication.draft;

    if (communication.booking_id) fields[mapping.booking_id] = communication.booking_id;
    if (communication.subject) fields[mapping.subject] = communication.subject;
    if (communication.sent_at) fields[mapping.sent_at] = communication.sent_at.toISOString();
    if (communication.approved_by) fields[mapping.approved_by] = communication.approved_by;
    if (communication.approved_at) fields[mapping.approved_at] = communication.approved_at.toISOString();
    if (communication.thread_id) fields[mapping.thread_id] = communication.thread_id;
    if (communication.from_address) fields[mapping.from_address] = communication.from_address;
    if (communication.to_address) fields[mapping.to_address] = communication.to_address;
    if (communication.in_reply_to) fields[mapping.in_reply_to] = communication.in_reply_to;

    return fields;
  }
}