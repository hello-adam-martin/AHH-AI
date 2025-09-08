export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tables: {
    properties: string;
    bookings: string;
    communications: string;
    approvals: string;
  };
}

export interface AirtableRecord<T = any> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface AirtableFieldMapping {
  [key: string]: string;
}

export interface AirtableQueryOptions {
  filterByFormula?: string;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  maxRecords?: number;
  pageSize?: number;
  view?: string;
}

export interface AirtableError extends Error {
  error: {
    type: string;
    message: string;
  };
  statusCode?: number;
}