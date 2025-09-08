import express from 'express';
import cors from 'cors';
// Config will be loaded via environment variables for now
import { AirtableService } from '@ahh-ai/integrations';
import { AIReceptionistService } from '@ahh-ai/ai';
import { createEmailRoutes } from './routes/email';
import { createApprovalRoutes } from './routes/approval';
import { createHealthRoutes } from './routes/health';
import { authenticateApiKey, rateLimit } from './middleware/auth';
import { errorHandler } from './middleware/validation';

async function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting (60 requests per minute)
  app.use(rateLimit(60, 60000));

  // Initialize services
  console.log('🔧 Initializing services...');
  const airtableService = new AirtableService();
  const aiService = new AIReceptionistService(airtableService);

  // Health check (no auth required)
  app.use('/health', createHealthRoutes());

  // Apply authentication to all other routes
  app.use(authenticateApiKey);

  // API Routes
  app.use('/api/email', createEmailRoutes(aiService, airtableService));
  app.use('/api/approvals', createApprovalRoutes(airtableService));

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use('*', (_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      message: 'The requested endpoint does not exist'
    });
  });

  return app;
}

async function startServer() {
  try {
    const app = await createServer();
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
      console.log(`🚀 AI Receptionist API server running on port ${port}`);
      console.log(`📍 Health check: http://localhost:${port}/health`);
      console.log(`📧 Email processing: http://localhost:${port}/api/email/process`);
      console.log(`⚖️ Approvals: http://localhost:${port}/api/approvals`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { createServer, startServer };