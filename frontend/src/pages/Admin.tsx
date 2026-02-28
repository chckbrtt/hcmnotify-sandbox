import { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  company_name: string;
  company_short: string;
  created_at: string;
  last_api_hit: string | null;
  total_api_calls: number;
}

interface Stats {
  totalSignups: number;
  signupsThisWeek: number;
  totalApiCalls: number;
}

export default function Admin() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);

    Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => r.json()),
      fetch('/api/admin/tenants', { headers }).then(r => r.json()),
    ]).then(([s, t]) => {
      setStats(s);
      setTenants(t.tenants);
    }).finally(() => setLoading(false));
  }, [token]);

  const exportCsv = () => {
    window.open(`/api/admin/export?token=${token}`, '_blank');
    // Also try with auth header via fetch
    fetch('/api/admin/export', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sandbox-signups.csv';
        a.click();
      });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 rounded-lg py-2.5 font-semibold transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-sm">H</div>
            <span className="text-xl font-semibold">HCMNotify</span>
            <span className="text-gray-500 text-sm ml-1">Admin Dashboard</span>
          </div>
          <button onClick={() => setToken('')} className="text-gray-400 hover:text-white text-sm">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard label="Total Signups" value={stats.totalSignups} />
            <StatCard label="This Week" value={stats.signupsThisWeek} />
            <StatCard label="Total API Calls" value={stats.totalApiCalls} />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Signups</h2>
          <button onClick={exportCsv} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            Export CSV
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Signup Date</th>
                  <th className="px-4 py-3">Last API Hit</th>
                  <th className="px-4 py-3 text-right">API Calls</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">{t.name}</td>
                    <td className="px-4 py-3 text-gray-400">{t.email}</td>
                    <td className="px-4 py-3">{t.company_name}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-400">{t.last_api_hit ? new Date(t.last_api_hit).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{t.total_api_calls}</td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No signups yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
