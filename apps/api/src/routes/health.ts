import { Router, Request, Response } from 'express';

export function createHealthRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'AI Receptionist API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  return router;
}