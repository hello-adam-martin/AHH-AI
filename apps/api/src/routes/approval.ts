import { Router, Request, Response } from 'express';
import { AirtableService } from '@ahh-ai/integrations';
import type { ApprovalActionRequest } from '../types';
import { validateRequest, ApprovalActionSchema } from '../middleware/validation';

export function createApprovalRoutes(
  airtableService: AirtableService
): Router {
  const router = Router();

  // Get all pending approvals
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const approvals = await airtableService.approvals.getPendingApprovals();
      
      res.json({
        success: true,
        data: approvals,
        count: approvals.length
      });
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch approvals'
      });
    }
  });

  // Approve or reject a specific approval
  router.post('/:id/:action',
    validateRequest(ApprovalActionSchema),
    async (req: Request, res: Response) => {
      try {
        const approvalId = req.params.id;
        const actionData = req.body as ApprovalActionRequest;
        
        console.log(`⚖️ ${actionData.action.toUpperCase()} approval ${approvalId}`);

        if (actionData.action === 'approve') {
          await airtableService.approvals.approveRequest(approvalId);
        } else {
          await airtableService.approvals.rejectRequest(approvalId);
        }

        res.json({
          success: true,
          message: `Approval ${actionData.action}d successfully`,
          approval_id: approvalId
        });

      } catch (error) {
        console.error(`❌ Error ${req.body.action}ing approval:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to ${req.body.action} approval`
        });
      }
    }
  );

  return router;
}