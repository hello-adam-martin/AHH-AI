// Airtable integration
export * from './airtable/client';
export * from './airtable/config';
export * from './airtable/properties';
export * from './airtable/bookings';
export * from './airtable/communications';
export * from './airtable/approvals';
export * from './airtable/service';

// Types
export * from './types/airtable';

// Main service export for easy access
export { AirtableService } from './airtable/service';