import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/schema';
import { seedTenant } from '../db/seed';
import { slugify, generateApiKey, generateClientId, generateClientSecret } from '../utils/helpers';
import { signupRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/api/signup', signupRateLimit, (req: Request, res: Response) => {
  const { name, email, company_name } = req.body;

  if (!name || !email || !company_name) {
    return res.status(400).json({ error: 'Name, email, and company name are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const db = getDb();

  // Check if email already exists
  const existing = db.prepare('SELECT * FROM tenants WHERE email = ?').get(email) as any;
  if (existing) {
    return res.json({
      id: existing.id,
      company_short: existing.company_short,
      company_id: existing.company_id,
      api_key: existing.api_key,
      client_id: existing.client_id,
      client_secret: existing.client_secret,
      base_url: `${process.env.BASE_URL || 'https://sandbox.hcmnotify.com'}/ta/rest`,
      message: 'Welcome back! Here are your existing credentials.'
    });
  }

  const tenantId = uuid();
  let companyShort = slugify(company_name);

  // Ensure unique company_short
  const shortExists = db.prepare('SELECT id FROM tenants WHERE company_short = ?').get(companyShort);
  if (shortExists) {
    companyShort += '-' + Math.random().toString(36).substring(2, 6);
  }

  const companyId = `SBX${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const apiKey = generateApiKey();
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  try {
    db.prepare(`
      INSERT INTO tenants (id, name, email, company_name, company_short, company_id, api_key, client_id, client_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tenantId, name, email, company_name, companyShort, companyId, apiKey, clientId, clientSecret);

    // Seed mock data
    seedTenant(tenantId);

    const credentials = {
      id: tenantId,
      company_short: companyShort,
      company_id: companyId,
      api_key: apiKey,
      client_id: clientId,
      client_secret: clientSecret,
      base_url: `${process.env.BASE_URL || 'https://sandbox.hcmnotify.com'}/ta/rest`,
      message: 'Sandbox created successfully! Save your credentials.'
    };

    // TODO: Send welcome email via SendGrid when configured

    return res.status(201).json(credentials);
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create sandbox. Please try again.' });
  }
});

export default router;
