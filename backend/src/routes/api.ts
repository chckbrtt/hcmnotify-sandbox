import { Router, Response } from 'express';
import { getDb } from '../db/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';

const router = Router();

// Apply auth and rate limiting to UKG API routes only
router.use('/ta/', requireAuth);
router.use('/ta/', apiRateLimit);

// ─── v1 Saved Reports ───────────────────────────────────────────────
router.get('/ta/rest/v1/report/saved/:reportId', (req: AuthRequest, res: Response) => {
  const { reportId } = req.params;
  const db = getDb();
  const accept = req.headers.accept || 'application/json';

  if (reportId === '1001') {
    // Employee Roster
    const employees = db.prepare(`
      SELECT employee_number, first_name, last_name, job_title, pay_rate, location, status, email, hire_date
      FROM employees WHERE tenant_id = ?
    `).all(req.tenantId!);

    if (accept.includes('text/csv')) {
      const csv = employeesToCsv(employees as any[]);
      return res.type('text/csv').send(csv);
    }
    return res.json({ report_id: 1001, report_name: 'Employee Roster', data: employees });

  } else if (reportId === '1002') {
    // Time Entries
    const entries = db.prepare(`
      SELECT e.employee_number, e.first_name || ' ' || e.last_name as employee_name,
             t.date, t.punch_in, t.punch_out, t.hours, t.department
      FROM time_entries t
      JOIN employees e ON e.id = t.employee_id
      WHERE t.tenant_id = ?
      ORDER BY t.date DESC
      LIMIT 1000
    `).all(req.tenantId!);

    if (accept.includes('text/csv')) {
      const csv = arrayToCsv(entries as any[]);
      return res.type('text/csv').send(csv);
    }
    return res.json({ report_id: 1002, report_name: 'Time Entries', data: entries });

  } else if (reportId === '1003') {
    // Benefits Elections
    const benefits = db.prepare(`
      SELECT e.employee_number, e.first_name || ' ' || e.last_name as employee_name,
             b.plan_name, b.coverage_level, b.employee_deduction, b.employer_contribution, b.effective_date, b.status
      FROM benefits b
      JOIN employees e ON e.id = b.employee_id
      WHERE b.tenant_id = ?
    `).all(req.tenantId!);

    if (accept.includes('text/csv')) {
      const csv = arrayToCsv(benefits as any[]);
      return res.type('text/csv').send(csv);
    }
    return res.json({ report_id: 1003, report_name: 'Benefits Elections', data: benefits });

  } else {
    return res.status(404).json({ error: `Report ${reportId} not found. Available: 1001, 1002, 1003` });
  }
});

// ─── v2 Employees List ──────────────────────────────────────────────
router.get('/ta/rest/v2/companies/:companyId/employees', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId!) as any;
  if (req.params.companyId !== tenant.company_id) {
    return res.status(403).json({ error: 'Company ID mismatch' });
  }

  const page = parseInt(req.query.page as string) || 1;
  const perPage = Math.min(parseInt(req.query.per_page as string) || 25, 100);
  const status = req.query.status as string;
  const location = req.query.location as string;

  let where = 'WHERE tenant_id = ?';
  const params: any[] = [req.tenantId!];

  if (status) { where += ' AND status = ?'; params.push(status); }
  if (location) { where += ' AND location = ?'; params.push(location); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM employees ${where}`).get(...params) as any).cnt;
  const offset = (page - 1) * perPage;
  params.push(perPage, offset);

  const employees = db.prepare(`
    SELECT id, employee_number, first_name, last_name, status, job_title, department, location, email
    FROM employees ${where}
    ORDER BY last_name, first_name
    LIMIT ? OFFSET ?
  `).all(...params);

  const baseUrl = `${process.env.BASE_URL || 'https://sandbox.hcmnotify.com'}/ta/rest/v2/companies/${tenant.company_id}`;

  return res.json({
    count: total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
    employees: (employees as any[]).map(emp => ({
      ...emp,
      _links: {
        self: `${baseUrl}/employees/${emp.id}`,
        pay: `${baseUrl}/employees/${emp.id}/pay`,
        benefits: `${baseUrl}/employees/${emp.id}/benefits`,
        time: `${baseUrl}/employees/${emp.id}/time`
      }
    }))
  });
});

// ─── v2 Employee Detail ─────────────────────────────────────────────
router.get('/ta/rest/v2/companies/:companyId/employees/:employeeId', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ? AND tenant_id = ?')
    .get(req.params.employeeId, req.tenantId!) as any;

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const baseUrl = `${process.env.BASE_URL || 'https://sandbox.hcmnotify.com'}/ta/rest/v2/companies/${req.params.companyId}`;

  return res.json({
    ...employee,
    _links: {
      self: `${baseUrl}/employees/${employee.id}`,
      pay: `${baseUrl}/employees/${employee.id}/pay`,
      benefits: `${baseUrl}/employees/${employee.id}/benefits`,
      time: `${baseUrl}/employees/${employee.id}/time`,
      documents: `${baseUrl}/employees/${employee.id}/documents`
    }
  });
});

// ─── v2 Employee Sub-Resources ──────────────────────────────────────
router.get('/ta/rest/v2/companies/:companyId/employees/:employeeId/pay', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const emp = db.prepare('SELECT * FROM employees WHERE id = ? AND tenant_id = ?')
    .get(req.params.employeeId, req.tenantId!) as any;
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  return res.json({
    employee_id: emp.id,
    employee_number: emp.employee_number,
    pay_rate: emp.pay_rate,
    pay_frequency: emp.pay_frequency,
    annual_salary: emp.pay_frequency === 'Weekly' ? emp.pay_rate * 40 * 52 :
                   emp.pay_frequency === 'Bi-Weekly' ? emp.pay_rate * 40 * 26 :
                   emp.pay_rate * 40 * 24
  });
});

router.get('/ta/rest/v2/companies/:companyId/employees/:employeeId/benefits', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const benefits = db.prepare('SELECT * FROM benefits WHERE employee_id = ? AND tenant_id = ?')
    .all(req.params.employeeId, req.tenantId!);
  return res.json({ employee_id: req.params.employeeId, benefits });
});

router.get('/ta/rest/v2/companies/:companyId/employees/:employeeId/time', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const entries = db.prepare(`
    SELECT * FROM time_entries WHERE employee_id = ? AND tenant_id = ?
    ORDER BY date DESC LIMIT 100
  `).all(req.params.employeeId, req.tenantId!);
  return res.json({ employee_id: req.params.employeeId, time_entries: entries });
});

router.get('/ta/rest/v2/companies/:companyId/employees/:employeeId/documents', (req: AuthRequest, res: Response) => {
  // Mock documents
  return res.json({
    employee_id: req.params.employeeId,
    documents: [
      { id: '1', name: 'W-4 Form', type: 'tax', uploaded_at: '2024-01-15' },
      { id: '2', name: 'Direct Deposit Authorization', type: 'payroll', uploaded_at: '2024-01-15' },
      { id: '3', name: 'I-9 Verification', type: 'compliance', uploaded_at: '2024-01-15' }
    ]
  });
});

// ─── v2 Company Config ──────────────────────────────────────────────
router.get('/ta/rest/v2/companies/:companyId/config', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantId!) as any;
  if (req.params.companyId !== tenant.company_id) {
    return res.status(403).json({ error: 'Company ID mismatch' });
  }

  const locations = db.prepare('SELECT * FROM locations WHERE tenant_id = ?').all(req.tenantId!);
  const departments = db.prepare('SELECT * FROM departments WHERE tenant_id = ?').all(req.tenantId!);
  const jobTitles = db.prepare('SELECT * FROM job_titles WHERE tenant_id = ?').all(req.tenantId!);

  return res.json({
    company_id: tenant.company_id,
    company_name: tenant.company_name,
    locations,
    departments,
    job_titles: jobTitles,
    pay_frequencies: ['Weekly', 'Bi-Weekly', 'Semi-Monthly']
  });
});

// ─── v1 Import ──────────────────────────────────────────────────────
router.post('/ta/rest/v1/import/:importId', (req: AuthRequest, res: Response) => {
  const { importId } = req.params;

  if (importId !== '100') {
    return res.status(404).json({ error: `Import ID ${importId} not found. Available: 100 (Employee Demographics)` });
  }

  const body = typeof req.body === 'string' ? req.body : '';
  if (!body.trim()) {
    return res.status(400).json({ error: 'CSV body required. Send CSV data in request body with Content-Type: text/csv' });
  }

  const lines = body.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV must contain a header row and at least one data row' });
  }

  const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  const required = ['first_name', 'last_name', 'email', 'hire_date'];
  const missing = required.filter(r => !headers.includes(r));

  if (missing.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required columns',
      errors: missing.map(m => ({ field: m, message: `Required column '${m}' not found in CSV header` }))
    });
  }

  const errors: any[] = [];
  const dataRows = lines.slice(1).filter(l => l.trim());

  for (let i = 0; i < dataRows.length; i++) {
    const cols = dataRows[i].split(',');
    if (cols.length !== headers.length) {
      errors.push({ row: i + 2, message: `Expected ${headers.length} columns, got ${cols.length}` });
    }
    const emailIdx = headers.indexOf('email');
    if (emailIdx >= 0 && cols[emailIdx] && !cols[emailIdx].includes('@')) {
      errors.push({ row: i + 2, field: 'email', message: `Invalid email: ${cols[emailIdx]}` });
    }
  }

  return res.json({
    status: errors.length > 0 ? 'partial' : 'success',
    records_processed: dataRows.length - errors.length,
    records_total: dataRows.length,
    errors
  });
});

// ─── v2 Webhooks ────────────────────────────────────────────────────
router.post('/ta/rest/v2/companies/:companyId/webhooks', (req: AuthRequest, res: Response) => {
  const { url, events } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const db = getDb();
  const id = require('uuid').v4();
  const eventList = events || ['ACCOUNT_CREATED', 'ACCOUNT_UPDATED'];

  db.prepare('INSERT INTO webhooks (id, tenant_id, url, events) VALUES (?, ?, ?, ?)')
    .run(id, req.tenantId!, url, JSON.stringify(eventList));

  // Fire a test event asynchronously
  setTimeout(async () => {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ACCOUNT_UPDATED',
          timestamp: new Date().toISOString(),
          data: {
            employee_id: 'test-employee-id',
            changes: ['email', 'department'],
            source: 'hcmnotify-sandbox'
          }
        })
      });
    } catch (e) {
      console.log('Webhook delivery failed (expected for testing):', (e as Error).message);
    }
  }, 2000);

  return res.status(201).json({
    id,
    url,
    events: eventList,
    status: 'active',
    message: 'Webhook registered. A test event will be sent to your URL shortly.'
  });
});

router.get('/ta/rest/v2/companies/:companyId/webhooks', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const webhooks = db.prepare('SELECT * FROM webhooks WHERE tenant_id = ?').all(req.tenantId!);
  return res.json({ webhooks });
});

// ─── Helpers ─────────────────────────────────────────────────────────
function employeesToCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = ['employee_number', 'first_name', 'last_name', 'job_title', 'pay_rate', 'location', 'status', 'email', 'hire_date'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => String(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

function arrayToCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => String(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

export default router;
