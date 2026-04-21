import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const LIFETIME_PRICE_ID = import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID;
const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;

export default function AccountSettings({ session, onBack }) {
  const [subscription, setSubscription] = useState(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        setSubscription(data);
        setLoadingSub(false);
      });
  }, [session.user.id]);

  const isLifetime = subscription?.price_id === LIFETIME_PRICE_ID;
  const planLabel = isLifetime ? 'Lifetime' : 'Monthly';
  const planColor = isLifetime ? 'text-green-400 bg-green-900/30' : 'text-indigo-400 bg-indigo-900/30';

  const changePassword = async () => {
    setPwMsg(null);
    if (!pwForm.next) return setPwMsg({ type: 'error', text: 'Please enter a new password.' });
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ type: 'error', text: 'Passwords do not match.' });
    if (pwForm.next.length < 6) return setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setPwLoading(false);
    if (error) return setPwMsg({ type: 'error', text: error.message });
    setPwMsg({ type: 'success', text: 'Password updated successfully.' });
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const upgradeToLifetime = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: LIFETIME_PRICE_ID,
          userId: session.user.id,
          email: session.user.email,
        }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch {
      alert('Something went wrong. Please try again.');
    }
    setUpgradeLoading(false);
  };

  const signOut = () => supabase.auth.signOut();

  const inp = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 bg-gray-950 z-40">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back</button>
        <span className="text-sm font-semibold text-white">Account Settings</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Account info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Account</p>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm text-gray-200">{session.user.email}</p>
          </div>
        </div>

        {/* Plan status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Plan</p>
          {loadingSub ? (
            <p className="text-xs text-gray-600">Loading...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-200">Current plan</p>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${planColor}`}>
                  {planLabel}
                </span>
              </div>
              {!isLifetime && (
                <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Upgrade to Lifetime</p>
                    <p className="text-xs text-gray-500 mt-1">One payment of $99. Never pay again. All future updates included.</p>
                  </div>
                  <button
                    onClick={upgradeToLifetime}
                    disabled={upgradeLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {upgradeLoading ? 'Loading...' : 'Upgrade to Lifetime — $99'}
                  </button>
                </div>
              )}
              {isLifetime && (
                <p className="text-xs text-gray-500">You have lifetime access. All future updates are included.</p>
              )}
            </>
          )}
        </div>

        {/* Change password */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Change Password</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">New Password</label>
              <input
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                placeholder="At least 6 characters"
                className={inp}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Re-enter new password"
                className={inp}
              />
            </div>
            {pwMsg && (
              <p className={`text-xs ${pwMsg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {pwMsg.text}
              </p>
            )}
            <button
              onClick={changePassword}
              disabled={pwLoading}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">Session</p>
          <button
            onClick={signOut}
            className="w-full bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-800 text-gray-400 hover:text-red-400 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}