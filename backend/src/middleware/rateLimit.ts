import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth';

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => {
    return (req as AuthRequest).tenantId || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Maximum 100 requests per minute.',
    retry_after: 60
  },
  handler: (req, res) => {
    res.status(429).set('Retry-After', '60').json({
      error: 'Rate limit exceeded. Maximum 100 requests per minute.',
      retry_after: 60
    });
  }
});

export const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many signup attempts. Please try again later.' }
});
