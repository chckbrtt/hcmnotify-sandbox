# HCMNotify Sandbox — UKG Ready API Simulator

## Overview
A mock UKG Ready API environment for YouTube tutorials, Postman follow-alongs, and community learning. Users sign up, get sandbox credentials, and hit endpoints that behave exactly like the real UKG Ready API — with fake data.

**Every signup = a lead for HCMNotify.**

## Stack
- Node.js + Express + TypeScript
- SQLite (via better-sqlite3)
- React frontend (signup + admin dashboard)
- Tailwind CSS (dark theme, matches hcmnotify.com aesthetic)
- Render.com deployment (free tier OK)

## Domain
- sandbox.hcmnotify.com (will point to Render via CNAME)

## Pages

### 1. Landing / Sign-Up Page
- Clean, dark theme matching hcmnotify.com
- HCMNotify branding with "API Sandbox" subtitle
- Sign-up form: Name, Email, Company Name
- On submit: creates sandbox tenant, emails credentials
- Show a "What you get" section:
  - v1 API key + v2 OAuth credentials
  - 100 mock employees with realistic data
  - Postman collection download link
  - Works with YouTube tutorial series

### 2. Credentials Page (post-signup)
- Shows their sandbox credentials immediately (don't make them wait for email)
- Company Short Name (auto-generated from their company, like "acme-corp")
- v1 API Key
- v2 Client ID + Client Secret
- Company ID
- Base URL: sandbox.hcmnotify.com/ta/rest
- "Copy" buttons for each field
- Link to download Postman collection
- Link to YouTube playlist (when ready)

### 3. Admin Dashboard (/admin — password protected)
- Login: admin / [use env var ADMIN_PASSWORD]
- Table of all signups: name, email, company, signup date, last API hit, total API calls
- Export to CSV button
- Simple stats at top: total signups, signups this week, total API calls

## Mock UKG Ready API

### Authentication

**v1 Auth** — POST /ta/rest/v1/login
- Headers: `Api-Key: {their_api_key}`
- Body: `{ "credentials": { "username": "sandbox", "password": "sandbox123", "company": "{their_company_short}" } }`
- Returns: `{ "token": "jwt-token-here" }`
- Token expires in 24 hours

**v2 Auth** — POST /ta/rest/v2/companies/{company_id}/oauth2/token  
- Body: `grant_type=client_credentials&client_id={id}&client_secret={secret}`
- Returns: `{ "access_token": "bearer-token-here", "token_type": "Bearer", "expires_in": 86400 }`

### Core Endpoints (all require valid token)

**GET /ta/rest/v1/report/saved/{report_id}**
- Accept: text/csv → returns CSV employee roster
- Accept: application/json → returns JSON
- Report IDs:
  - 1001 = Employee Roster (name, job, pay_rate, location, status, email, hire_date)
  - 1002 = Time Entries (employee, date, punch_in, punch_out, hours, department)
  - 1003 = Benefits Elections (employee, plan, coverage, deduction, effective_date)

**GET /ta/rest/v2/companies/{company_id}/employees**
- Returns paginated employee summary list (JSON)
- Supports: ?page=1&per_page=25, ?status=active, ?location=

**GET /ta/rest/v2/companies/{company_id}/employees/{employee_id}**
- Returns full employee detail with embedded URLs for:
  - /pay — compensation details
  - /benefits — benefit elections
  - /time — time entries
  - /documents — employee documents

**GET /ta/rest/v2/companies/{company_id}/config**
- Returns company configuration (locations, departments, job titles, pay frequencies)

**POST /ta/rest/v1/import/{import_id}**
- Import ID 100 = Employee Demographics
- Accepts CSV body
- Returns: `{ "status": "success", "records_processed": N, "errors": [] }`
- Actually validates CSV headers, returns realistic errors for bad data

### Webhook Simulation
**POST /ta/rest/v2/companies/{company_id}/webhooks**
- Register a webhook URL
- We fire test events to their URL: ACCOUNT_CREATED, ACCOUNT_UPDATED
- Great for Ep teaching webhooks

## Mock Data Generation
Each sandbox tenant gets:
- 1 company with 3 locations, 8 departments, 15 job titles
- 100 employees (mix of active/terminated/LOA)
- Realistic names (faker.js), SSN-like masked IDs
- Pay rates ranging $15-85/hr
- 30 days of time punch history
- Benefits elections for ~60% of employees
- A few "problem" records for teaching troubleshooting:
  - 1 employee with missing SSN
  - 1 with duplicate name
  - 1 terminated but still showing active benefits
  - 1 with pay rate of $0.00

## Email (SendGrid)
- On signup, send welcome email with:
  - All credentials
  - Quick start guide
  - Link to Postman collection
  - Link to YouTube (when available)
- From: sandbox@hcmnotify.com (or noreply@hcmnotify.com)
- SendGrid DNS records already configured on hcmnotify.com domain

## Rate Limiting
- 100 API calls per minute per tenant (generous for learning)
- Return proper 429 with Retry-After header (teaches real-world rate limits)

## Environment Variables (for Render)
- DATABASE_URL (or default to local SQLite file)
- ADMIN_PASSWORD
- SENDGRID_API_KEY
- JWT_SECRET
- BASE_URL=https://sandbox.hcmnotify.com

## Render Config
- Build: npm install && npm run build
- Start: npm run start
- Free tier OK (cold starts fine — users expect it from a free sandbox)
