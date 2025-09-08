import express from 'express';
import cors from 'cors';
import { createHealthRoutes } from './routes/health';

async function createMinimalServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Health check only
  app.use('/health', createHealthRoutes());

  // Simple test endpoint
  app.get('/test', (_req, res) => {
    res.json({
      success: true,
      message: 'Minimal API server working',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

async function startMinimalServer() {
  try {
    const app = await createMinimalServer();
    const port = process.env.PORT || 3333;

    app.listen(port, () => {
      console.log(`🚀 Minimal API server running on port ${port}`);
      console.log(`📍 Health check: http://localhost:${port}/health`);
      console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
    });
  } catch (error) {
    console.error('❌ Failed to start minimal server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startMinimalServer();
}

export { createMinimalServer, startMinimalServer };