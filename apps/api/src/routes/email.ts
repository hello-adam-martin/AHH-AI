import { Router, Request, Response } from 'express';
import { AIReceptionistService } from '@ahh-ai/ai';
import { AirtableService } from '@ahh-ai/integrations';
import type { InboundEmail } from '@ahh-ai/core';
import type { ProcessEmailRequest, ProcessEmailResponse } from '../types';
import { validateRequest, ProcessEmailSchema } from '../middleware/validation';

export function createEmailRoutes(
  aiService: AIReceptionistService,
  airtableService: AirtableService
): Router {
  const router = Router();

  // Process an email (for testing without Gmail integration)
  router.post('/process', 
    validateRequest(ProcessEmailSchema),
    async (req: Request, res: Response) => {
      try {
        const emailData = req.body as ProcessEmailRequest;
        
        // Convert request to InboundEmail format
        const inboundEmail: InboundEmail = {
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          html: emailData.html,
          thread_id: emailData.thread_id,
          message_id: emailData.message_id || `test-${Date.now()}`,
          received_at: emailData.received_at ? new Date(emailData.received_at) : new Date(),
        };

        console.log(`📧 Processing email from ${inboundEmail.from}: ${inboundEmail.subject}`);

        // Process with AI service
        const aiResponse = await aiService.handleInboundEmail(inboundEmail);

        console.log(`🤖 AI Response - Confidence: ${aiResponse.confidence}, Approval: ${aiResponse.requires_approval}`);

        // Build response
        const response: ProcessEmailResponse = {
          success: true,
          message: 'Email processed successfully',
          ai_response: {
            message: aiResponse.message,
            confidence: aiResponse.confidence,
            requires_approval: aiResponse.requires_approval,
            risk_flags: aiResponse.risk_flags,
            reasoning: aiResponse.reasoning
          }
        };

        // If approval was created, include the IDs
        if (aiResponse.requires_approval) {
          // Get the latest draft communication for this email
          const recentComms = await airtableService.communications.getRecentCommunications(1);
          const draftComm = recentComms.find(comm => 
            comm.draft && 
            comm.from_address === inboundEmail.from
          );

          if (draftComm) {
            response.comm_id = draftComm.comm_id;

            // Find the approval entry
            const pendingApprovals = await airtableService.approvals.getPendingApprovals();
            const relatedApproval = pendingApprovals.find(approval => 
              approval.comm_id === draftComm.comm_id
            );

            if (relatedApproval) {
              response.approval_id = relatedApproval.approval_id;
            }
          }
        }

        res.json(response);

      } catch (error) {
        console.error('❌ Email processing error:', error);
        
        const response: ProcessEmailResponse = {
          success: false,
          message: 'Failed to process email',
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        res.status(500).json(response);
      }
    }
  );

  // Simulate Gmail webhook (for future use)
  router.post('/webhook/gmail', async (req: Request, res: Response) => {
    try {
      // This would be implemented when we add Gmail integration
      console.log('📨 Gmail webhook received:', req.body);
      
      res.json({
        success: true,
        message: 'Webhook received (not yet implemented)'
      });

    } catch (error) {
      console.error('❌ Gmail webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook'
      });
    }
  });

  return router;
}