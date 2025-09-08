import type { Property } from '@ahh-ai/core';
import type { AirtableRecord } from '../types/airtable';
import { AirtableClient } from './client';
import { AIRTABLE_FIELD_MAPPINGS } from './config';

interface AirtableProperty {
  [key: string]: any;
}

export class PropertiesClient {
  constructor(private client: AirtableClient) {}

  async getProperty(propertyId: string): Promise<Property | null> {
    const tableName = this.client.getTableName('properties');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.properties.property_id}} = "${propertyId}"`;
    
    const records = await this.client.findRecords<AirtableProperty>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      return null;
    }

    return this.mapFromAirtable(records[0]);
  }

  async getAllProperties(): Promise<Property[]> {
    const tableName = this.client.getTableName('properties');
    const records = await this.client.findRecords<AirtableProperty>(tableName);
    
    return records.map(record => this.mapFromAirtable(record));
  }

  async createProperty(property: Omit<Property, 'property_id'>): Promise<string> {
    const tableName = this.client.getTableName('properties');
    const airtableFields = this.mapToAirtable(property);
    
    return await this.client.createRecord(tableName, airtableFields);
  }

  async updateProperty(propertyId: string, updates: Partial<Property>): Promise<void> {
    const tableName = this.client.getTableName('properties');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.properties.property_id}} = "${propertyId}"`;
    
    const records = await this.client.findRecords<AirtableProperty>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Property not found: ${propertyId}`);
    }

    const airtableFields = this.mapToAirtable(updates);
    await this.client.updateRecord(tableName, records[0].id, airtableFields);
  }

  async getPropertiesWithSecureAccess(): Promise<Property[]> {
    const tableName = this.client.getTableName('properties');
    const filterFormula = `NOT({${AIRTABLE_FIELD_MAPPINGS.properties.access_instructions_secure}} = "")`;
    
    const records = await this.client.findRecords<AirtableProperty>(tableName, {
      filterByFormula: filterFormula,
    });
    
    return records.map(record => this.mapFromAirtable(record));
  }

  private mapFromAirtable(record: AirtableRecord<AirtableProperty>): Property {
    const fields = record.fields;
    const mapping = AIRTABLE_FIELD_MAPPINGS.properties;

    let faqOverrides: Record<string, string> | undefined;
    if (fields[mapping.faq_overrides]) {
      try {
        faqOverrides = JSON.parse(fields[mapping.faq_overrides]);
      } catch (error) {
        console.warn(`Failed to parse FAQ overrides for property ${fields[mapping.property_id]}:`, error);
      }
    }

    return {
      property_id: fields[mapping.property_id] || record.id,
      name: fields[mapping.name] || '',
      address: fields[mapping.address] || '',
      wifi_ssid: fields[mapping.wifi_ssid],
      wifi_password: fields[mapping.wifi_password],
      checkin_time: fields[mapping.checkin_time] || '3:00 PM',
      checkout_time: fields[mapping.checkout_time] || '10:00 AM',
      parking_instructions: fields[mapping.parking_instructions],
      access_instructions_public: fields[mapping.access_instructions_public],
      access_instructions_secure: fields[mapping.access_instructions_secure],
      house_rules: fields[mapping.house_rules],
      faq_overrides: faqOverrides,
    };
  }

  private mapToAirtable(property: Partial<Property>): Partial<AirtableProperty> {
    const mapping = AIRTABLE_FIELD_MAPPINGS.properties;
    const fields: Partial<AirtableProperty> = {};

    if (property.property_id !== undefined) fields[mapping.property_id] = property.property_id;
    if (property.name !== undefined) fields[mapping.name] = property.name;
    if (property.address !== undefined) fields[mapping.address] = property.address;
    if (property.wifi_ssid !== undefined) fields[mapping.wifi_ssid] = property.wifi_ssid;
    if (property.wifi_password !== undefined) fields[mapping.wifi_password] = property.wifi_password;
    if (property.checkin_time !== undefined) fields[mapping.checkin_time] = property.checkin_time;
    if (property.checkout_time !== undefined) fields[mapping.checkout_time] = property.checkout_time;
    if (property.parking_instructions !== undefined) fields[mapping.parking_instructions] = property.parking_instructions;
    if (property.access_instructions_public !== undefined) fields[mapping.access_instructions_public] = property.access_instructions_public;
    if (property.access_instructions_secure !== undefined) fields[mapping.access_instructions_secure] = property.access_instructions_secure;
    if (property.house_rules !== undefined) fields[mapping.house_rules] = property.house_rules;
    if (property.faq_overrides !== undefined) {
      fields[mapping.faq_overrides] = JSON.stringify(property.faq_overrides);
    }

    return fields;
  }
}