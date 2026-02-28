import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/schema';
import { verifyToken } from '../utils/helpers';

export interface AuthRequest extends Request {
  tenantId?: string;
  tokenType?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Verify token exists in DB
  const db = getDb();
  const tokenRow = db.prepare('SELECT * FROM tokens WHERE token = ? AND expires_at > datetime(\'now\')').get(token);
  if (!tokenRow) {
    return res.status(401).json({ error: 'Token expired or revoked' });
  }

  // Update last_api_hit and total_api_calls
  db.prepare('UPDATE tenants SET last_api_hit = datetime(\'now\'), total_api_calls = total_api_calls + 1 WHERE id = ?')
    .run(decoded.tenantId);

  req.tenantId = decoded.tenantId;
  req.tokenType = decoded.type;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.slice(7);
  const db = getDb();
  const session = db.prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime(\'now\')').get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }

  next();
}
