import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company_name: companyName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Store credentials and navigate
      sessionStorage.setItem('credentials', JSON.stringify(data));
      navigate('/credentials');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-sm">H</div>
          <span className="text-xl font-semibold">HCMNotify</span>
          <span className="text-gray-500 text-sm ml-1">API Sandbox</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Left: Hero */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Learn the <span className="text-brand-400">UKG Ready API</span> with real endpoints
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Get instant sandbox credentials with 100 mock employees. Follow along with our YouTube tutorials using a real API — no UKG account needed.
            </p>

            <div className="space-y-4">
              <Feature icon="🔑" title="v1 API Key + v2 OAuth Credentials" desc="Both authentication flows, just like production" />
              <Feature icon="👥" title="100 Mock Employees" desc="Realistic names, pay rates, time entries, and benefits" />
              <Feature icon="📬" title="Postman Collection" desc="Pre-built collection to start making API calls immediately" />
              <Feature icon="🎥" title="YouTube Tutorial Series" desc="Step-by-step video guides for every endpoint" />
            </div>
          </div>

          {/* Right: Signup Form */}
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-semibold mb-6">Get Your Sandbox</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                <input
                  type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Acme Corp"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-lg py-3 font-semibold transition-colors mt-2"
              >
                {loading ? 'Creating Sandbox...' : 'Create Free Sandbox →'}
              </button>
            </form>

            <p className="text-gray-500 text-xs mt-4 text-center">
              Free forever. No credit card needed.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-8 mt-16">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} HCMNotify. Built for the HCM integration community.
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-gray-500 text-sm">{desc}</p>
      </div>
    </div>
  );
}
