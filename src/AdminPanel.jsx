import { useState } from "react";
import { supabase } from "./supabase";

const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow w-full";

export default function AdminPanel({ session }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const createSupervisor = async () => {
    if (!email.trim()) return alert('Email is required.');
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/create-supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          company: company.trim(),
          requesterId: session.user.id,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setEmail('');
      setDisplayName('');
      setCompany('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const copyText = (text, btn) => {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-4 py-3">
        <span className="text-sm font-bold text-white">FSM Admin</span>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-white">Create Supervisor Account</h1>
          <p className="text-xs text-gray-500 mt-1">Creates a supervisor account and generates a temporary password to send them.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Email *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="supervisor@studio.com" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith" className={inp} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Netflix" className={inp} />
          </div>
          <button
            onClick={createSupervisor}
            disabled={loading}
            className="bg-brand-yellow hover:bg-brand-yellow disabled:opacity-50 text-brand-navy py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? 'Creating...' : 'Create Supervisor Account'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-green-400">Account created successfully</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Login URL</span>
                <button
                  onClick={e => copyText('https://app.friedsodamusic.com', e.target)}
                  className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-300 bg-gray-800 rounded-lg px-3 py-2">https://app.friedsodamusic.com</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Temporary Password</span>
                <button
                  onClick={e => copyText(result.tempPassword, e.target)}
                  className="text-xs text-brand-yellow/75 hover:text-brand-yellow transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-300 bg-gray-800 rounded-lg px-3 py-2 font-mono">{result.tempPassword}</p>
            </div>
            <p className="text-xs text-gray-500">Send the login URL and temporary password to the supervisor. They can change their password in Account Settings after logging in.</p>
          </div>
        )}
      </div>
    </div>
  );
}