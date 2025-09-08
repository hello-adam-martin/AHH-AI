import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const ProcessEmailSchema = z.object({
  from: z.string().email('Invalid sender email'),
  to: z.string().email('Invalid recipient email'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  html: z.string().optional(),
  thread_id: z.string().optional(),
  message_id: z.string().optional(),
  received_at: z.string().datetime().optional(),
});

export const ApprovalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
      return;
    }
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}