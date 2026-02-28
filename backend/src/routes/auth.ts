import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generateToken } from '../utils/helpers';

const router = Router();

// v1 Login
router.post('/ta/rest/v1/login', (req: Request, res: Response) => {
  const apiKey = req.headers['api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: 'Api-Key header required' });
  }

  const { credentials } = req.body || {};
  if (!credentials || !credentials.username || !credentials.password || !credentials.company) {
    return res.status(400).json({ error: 'credentials object with username, password, and company required' });
  }

  if (credentials.username !== 'sandbox' || credentials.password !== 'sandbox123') {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE api_key = ? AND company_short = ?')
    .get(apiKey, credentials.company) as any;

  if (!tenant) {
    return res.status(401).json({ error: 'Invalid API key or company' });
  }

  const token = generateToken(tenant.id, 'v1');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO tokens (token, tenant_id, type, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, tenant.id, 'v1', expiresAt);

  db.prepare('UPDATE tenants SET last_api_hit = datetime(\'now\'), total_api_calls = total_api_calls + 1 WHERE id = ?')
    .run(tenant.id);

  return res.json({ token });
});

// v2 OAuth2 Token
router.post('/ta/rest/v2/companies/:companyId/oauth2/token', (req: Request, res: Response) => {
  const { companyId } = req.params;

  // Support both form-urlencoded and JSON
  const grantType = req.body.grant_type;
  const clientId = req.body.client_id;
  const clientSecret = req.body.client_secret;

  if (grantType !== 'client_credentials') {
    return res.status(400).json({ error: 'Only grant_type=client_credentials is supported' });
  }

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'client_id and client_secret required' });
  }

  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE company_id = ? AND client_id = ? AND client_secret = ?')
    .get(companyId, clientId, clientSecret) as any;

  if (!tenant) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(tenant.id, 'v2');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO tokens (token, tenant_id, type, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, tenant.id, 'v2', expiresAt);

  db.prepare('UPDATE tenants SET last_api_hit = datetime(\'now\'), total_api_calls = total_api_calls + 1 WHERE id = ?')
    .run(tenant.id);

  return res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 86400
  });
});

export default router;
