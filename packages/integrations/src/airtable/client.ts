import Airtable from 'airtable';
import type { AirtableConfig, AirtableRecord, AirtableQueryOptions, AirtableError } from '../types/airtable';
import { getAirtableConfig } from './config';

export class AirtableClient {
  private base: Airtable.Base;
  private config: AirtableConfig;

  constructor(config?: Partial<AirtableConfig>) {
    this.config = { ...getAirtableConfig(), ...config };
    
    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: this.config.apiKey,
    });
    
    this.base = Airtable.base(this.config.baseId);
  }

  async findRecords<T>(
    tableName: string,
    options: AirtableQueryOptions = {}
  ): Promise<AirtableRecord<T>[]> {
    try {
      const records = await this.base(tableName)
        .select({
          filterByFormula: options.filterByFormula,
          sort: options.sort,
          maxRecords: options.maxRecords,
          pageSize: options.pageSize || 100,
          view: options.view,
        })
        .all();

      return records.map(record => ({
        id: (record as any).id,
        fields: record.fields as T,
        createdTime: (record as any)._rawJson?.createdTime || new Date().toISOString(),
      }));
    } catch (error) {
      throw this.handleAirtableError(error);
    }
  }

  async getRecord<T>(tableName: string, recordId: string): Promise<AirtableRecord<T> | null> {
    try {
      const record = await this.base(tableName).find(recordId);
      return {
        id: (record as any).id,
        fields: record.fields as T,
        createdTime: (record as any)._rawJson?.createdTime || new Date().toISOString(),
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw this.handleAirtableError(error);
    }
  }

  async createRecord<T>(tableName: string, fields: Partial<T>): Promise<string> {
    try {
      const record = await this.base(tableName).create(fields as any);
      return (record as any).id;
    } catch (error) {
      throw this.handleAirtableError(error);
    }
  }

  async updateRecord<T>(
    tableName: string,
    recordId: string,
    fields: Partial<T>
  ): Promise<void> {
    try {
      await this.base(tableName).update(recordId, fields as any);
    } catch (error) {
      throw this.handleAirtableError(error);
    }
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    try {
      await this.base(tableName).destroy(recordId);
    } catch (error) {
      throw this.handleAirtableError(error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.findRecords(this.config.tables.properties, { maxRecords: 1 });
      return true;
    } catch (error) {
      console.error('Airtable health check failed:', error);
      return false;
    }
  }

  private handleAirtableError(error: any): AirtableError {
    const airtableError = error as AirtableError;
    
    if (error.error) {
      airtableError.message = `Airtable API Error: ${error.error.message}`;
    } else if (error.message) {
      airtableError.message = `Airtable Error: ${error.message}`;
    } else {
      airtableError.message = 'Unknown Airtable error occurred';
    }

    return airtableError;
  }

  private isNotFoundError(error: any): boolean {
    return error.statusCode === 404 || 
           (error.error && error.error.type === 'NOT_FOUND');
  }

  public getTableName(tableKey: keyof AirtableConfig['tables']): string {
    return this.config.tables[tableKey];
  }
}