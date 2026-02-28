import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CopyButton from '../components/CopyButton';

interface Creds {
  company_short: string;
  company_id: string;
  api_key: string;
  client_id: string;
  client_secret: string;
  base_url: string;
  message: string;
}

export default function Credentials() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('credentials');
    if (!stored) {
      navigate('/');
      return;
    }
    setCreds(JSON.parse(stored));
  }, [navigate]);

  if (!creds) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-sm">H</div>
          <span className="text-xl font-semibold">HCMNotify</span>
          <span className="text-gray-500 text-sm ml-1">API Sandbox</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mb-8">
          <p className="text-green-400 font-medium">✅ {creds.message}</p>
        </div>

        <h1 className="text-3xl font-bold mb-8">Your Sandbox Credentials</h1>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 divide-y divide-gray-800">
          <CredRow label="Base URL" value={creds.base_url} />
          <CredRow label="Company Short Name" value={creds.company_short} />
          <CredRow label="Company ID" value={creds.company_id} />

          <div className="p-5">
            <h3 className="text-brand-400 font-semibold mb-3 text-sm uppercase tracking-wider">v1 Authentication</h3>
            <CredRow label="API Key" value={creds.api_key} nested />
            <div className="mt-2 text-sm text-gray-500">
              Username: <code className="text-gray-300">sandbox</code> &nbsp;|&nbsp; Password: <code className="text-gray-300">sandbox123</code>
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-brand-400 font-semibold mb-3 text-sm uppercase tracking-wider">v2 OAuth2 (Client Credentials)</h3>
            <CredRow label="Client ID" value={creds.client_id} nested />
            <CredRow label="Client Secret" value={creds.client_secret} nested />
          </div>
        </div>

        {/* Quick Start */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Quick Start</h2>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="font-medium mb-3">1. Get a v2 Token</h3>
            <pre className="bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto text-green-400">
{`curl -X POST "${creds.base_url}/v2/companies/${creds.company_id}/oauth2/token" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=${creds.client_id}" \\
  -d "client_secret=${creds.client_secret}"`}
            </pre>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mt-4">
            <h3 className="font-medium mb-3">2. List Employees</h3>
            <pre className="bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto text-green-400">
{`curl "${creds.base_url}/v2/companies/${creds.company_id}/employees?page=1&per_page=10" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE"`}
            </pre>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mt-4">
            <h3 className="font-medium mb-3">3. Get Employee Roster (CSV)</h3>
            <pre className="bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto text-green-400">
{`curl "${creds.base_url}/v1/report/saved/1001" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Accept: text/csv"`}
            </pre>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <a
            href="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </main>
    </div>
  );
}

function CredRow({ label, value, nested }: { label: string; value: string; nested?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${nested ? 'py-2' : 'p-5'}`}>
      <div className="min-w-0">
        <span className="text-gray-400 text-sm">{label}</span>
        <p className="font-mono text-sm break-all mt-0.5">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}
