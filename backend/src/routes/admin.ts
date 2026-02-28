import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Admin login
router.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const db = getDb();
  const token = uuid();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)').run(token, expiresAt);

  return res.json({ token });
});

// Admin stats
router.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();

  const totalSignups = (db.prepare('SELECT COUNT(*) as cnt FROM tenants').get() as any).cnt;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const signupsThisWeek = (db.prepare('SELECT COUNT(*) as cnt FROM tenants WHERE created_at >= ?').get(weekAgo) as any).cnt;
  const totalApiCalls = (db.prepare('SELECT COALESCE(SUM(total_api_calls), 0) as total FROM tenants').get() as any).total;

  return res.json({ totalSignups, signupsThisWeek, totalApiCalls });
});

// Admin tenants list
router.get('/api/admin/tenants', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const tenants = db.prepare(`
    SELECT id, name, email, company_name, company_short, created_at, last_api_hit, total_api_calls
    FROM tenants ORDER BY created_at DESC
  `).all();

  return res.json({ tenants });
});

// Export CSV
router.get('/api/admin/export', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const tenants = db.prepare(`
    SELECT name, email, company_name, company_short, created_at, last_api_hit, total_api_calls
    FROM tenants ORDER BY created_at DESC
  `).all() as any[];

  const headers = ['name', 'email', 'company_name', 'company_short', 'created_at', 'last_api_hit', 'total_api_calls'];
  const csv = [headers.join(','), ...tenants.map(t => headers.map(h => String(t[h] ?? '')).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sandbox-signups.csv');
  return res.send(csv);
});

export default router;
