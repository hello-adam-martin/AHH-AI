import type { Approval, ApprovalStatus, ApprovalType, RiskFlag } from '@ahh-ai/core';
import type { AirtableRecord } from '../types/airtable';
import { AirtableClient } from './client';
import { AIRTABLE_FIELD_MAPPINGS } from './config';
import { generateCorrelationId } from '@ahh-ai/core';

interface AirtableApproval {
  [key: string]: any;
}

export class ApprovalsClient {
  constructor(private client: AirtableClient) {}

  async createApproval(approval: Omit<Approval, 'approval_id' | 'created_at'>): Promise<string> {
    const tableName = this.client.getTableName('approvals');
    const approvalWithId: Approval = {
      ...approval,
      approval_id: generateCorrelationId(),
      created_at: new Date(),
    };
    
    const airtableFields = this.mapToAirtable(approvalWithId);
    await this.client.createRecord(tableName, airtableFields);
    
    return approvalWithId.approval_id;
  }

  async getApproval(approvalId: string): Promise<Approval | null> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.approval_id}} = "${approvalId}"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      return null;
    }

    return this.mapFromAirtable(records[0]);
  }

  async getPendingApprovals(): Promise<Approval[]> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.status}} = "pending"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.approvals.created_at, direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getApprovalsByAssignee(assignee: string): Promise<Approval[]> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.assignee}} = "${assignee}"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.approvals.created_at, direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getApprovalsByType(type: ApprovalType): Promise<Approval[]> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.type}} = "${type}"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.approvals.created_at, direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async approveRequest(approvalId: string): Promise<void> {
    await this.updateApprovalStatus(approvalId, 'approved');
  }

  async rejectRequest(approvalId: string): Promise<void> {
    await this.updateApprovalStatus(approvalId, 'rejected');
  }

  async updateApprovalStatus(approvalId: string, status: ApprovalStatus): Promise<void> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.approval_id}} = "${approvalId}"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    const updateFields = {
      [AIRTABLE_FIELD_MAPPINGS.approvals.status]: status,
      [AIRTABLE_FIELD_MAPPINGS.approvals.resolved_at]: new Date().toISOString(),
    };

    await this.client.updateRecord(tableName, records[0].id, updateFields);
  }

  async assignApproval(approvalId: string, assignee: string): Promise<void> {
    const tableName = this.client.getTableName('approvals');
    const filterFormula = `{${AIRTABLE_FIELD_MAPPINGS.approvals.approval_id}} = "${approvalId}"`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      maxRecords: 1,
    });

    if (records.length === 0) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    const updateFields = {
      [AIRTABLE_FIELD_MAPPINGS.approvals.assignee]: assignee,
    };

    await this.client.updateRecord(tableName, records[0].id, updateFields);
  }

  async getApprovalsByRiskFlags(riskFlags: RiskFlag[]): Promise<Approval[]> {
    const tableName = this.client.getTableName('approvals');
    
    // Create OR conditions for each risk flag
    const flagConditions = riskFlags.map(flag => 
      `SEARCH("${flag}", {${AIRTABLE_FIELD_MAPPINGS.approvals.risk_flags}})`
    ).join(' OR ');
    
    const filterFormula = `OR(${flagConditions})`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.approvals.created_at, direction: 'desc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  async getOldPendingApprovals(hoursOld: number = 24): Promise<Approval[]> {
    const tableName = this.client.getTableName('approvals');
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const cutoffStr = cutoffTime.toISOString();
    
    const filterFormula = `AND({${AIRTABLE_FIELD_MAPPINGS.approvals.status}} = "pending", {${AIRTABLE_FIELD_MAPPINGS.approvals.created_at}} <= "${cutoffStr}")`;
    
    const records = await this.client.findRecords<AirtableApproval>(tableName, {
      filterByFormula: filterFormula,
      sort: [{ field: AIRTABLE_FIELD_MAPPINGS.approvals.created_at, direction: 'asc' }],
    });

    return records.map(record => this.mapFromAirtable(record));
  }

  private mapFromAirtable(record: AirtableRecord<AirtableApproval>): Approval {
    const fields = record.fields;
    const mapping = AIRTABLE_FIELD_MAPPINGS.approvals;

    let riskFlags: RiskFlag[] = [];
    if (fields[mapping.risk_flags]) {
      try {
        riskFlags = Array.isArray(fields[mapping.risk_flags]) 
          ? fields[mapping.risk_flags] 
          : fields[mapping.risk_flags].split(',').map((f: string) => f.trim());
      } catch (error) {
        console.warn(`Failed to parse risk flags for approval ${fields[mapping.approval_id]}:`, error);
      }
    }

    let payload: any = {};
    if (fields[mapping.payload]) {
      try {
        payload = typeof fields[mapping.payload] === 'string' 
          ? JSON.parse(fields[mapping.payload]) 
          : fields[mapping.payload];
      } catch (error) {
        console.warn(`Failed to parse payload for approval ${fields[mapping.approval_id]}:`, error);
      }
    }

    return {
      approval_id: fields[mapping.approval_id] || record.id,
      type: (fields[mapping.type] || 'reply') as ApprovalType,
      payload,
      status: (fields[mapping.status] || 'pending') as ApprovalStatus,
      created_at: new Date(fields[mapping.created_at] || record.createdTime),
      resolved_at: fields[mapping.resolved_at] ? new Date(fields[mapping.resolved_at]) : undefined,
      assignee: fields[mapping.assignee],
      comm_id: fields[mapping.comm_id],
      risk_flags: riskFlags,
      confidence_score: fields[mapping.confidence_score] ? Number(fields[mapping.confidence_score]) : undefined,
      approval_url: fields[mapping.approval_url],
      reject_url: fields[mapping.reject_url],
    };
  }

  private mapToAirtable(approval: Approval): Partial<AirtableApproval> {
    const mapping = AIRTABLE_FIELD_MAPPINGS.approvals;
    const fields: Partial<AirtableApproval> = {};

    fields[mapping.approval_id] = approval.approval_id;
    fields[mapping.type] = approval.type;
    fields[mapping.payload] = JSON.stringify(approval.payload);
    fields[mapping.status] = approval.status;
    fields[mapping.created_at] = approval.created_at.toISOString();

    if (approval.resolved_at) fields[mapping.resolved_at] = approval.resolved_at.toISOString();
    if (approval.assignee) fields[mapping.assignee] = approval.assignee;
    if (approval.comm_id) fields[mapping.comm_id] = approval.comm_id;
    if (approval.risk_flags && approval.risk_flags.length > 0) {
      fields[mapping.risk_flags] = approval.risk_flags.join(', ');
    }
    if (approval.confidence_score !== undefined) fields[mapping.confidence_score] = approval.confidence_score;
    if (approval.approval_url) fields[mapping.approval_url] = approval.approval_url;
    if (approval.reject_url) fields[mapping.reject_url] = approval.reject_url;

    return fields;
  }
}