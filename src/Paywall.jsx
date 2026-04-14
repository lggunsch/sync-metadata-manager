import { useState } from "react";
import { supabase } from "./supabase";

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;
const LIFETIME_PRICE_ID = import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID;

export default function Paywall({ session }) {
  const [loading, setLoading] = useState(null);

  const checkout = async (priceId) => {
    setLoading(priceId);
    try {
      const res = await fetch('/api/create-checkout-session.cjs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: session.user.id,
          email: session.user.email,
        }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert('Something went wrong. Please try again.');
    }
    setLoading(null);
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">FriedSoda Music</h1>
          <p className="text-gray-500 mt-2">Sync Metadata Manager</p>
          <p className="text-gray-400 mt-4 text-sm">Choose a plan to get started</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Monthly */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Monthly</h2>
                <p className="text-gray-500 text-sm mt-1">Full access, cancel anytime</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">$10</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 mb-6">
              {['Unlimited projects & tracks','Full metadata management','Pitch Manager','CSV & Excel import','PDF sync sheet export'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-green-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => checkout(MONTHLY_PRICE_ID)} disabled={!!loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-semibold transition-colors">
              {loading === MONTHLY_PRICE_ID ? 'Loading...' : 'Get Started — $10/mo'}
            </button>
          </div>

          {/* Lifetime */}
          <div className="bg-gray-900 border border-indigo-500 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Best Value</span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Lifetime</h2>
                <p className="text-gray-500 text-sm mt-1">One payment, forever</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">$99</span>
                <span className="text-gray-500 text-sm"> once</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 mb-6">
              {['Everything in Monthly','All future updates included','Never pay again','Priority support'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-green-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => checkout(LIFETIME_PRICE_ID)} disabled={!!loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-lg text-sm font-semibold transition-colors">
              {loading === LIFETIME_PRICE_ID ? 'Loading...' : 'Get Lifetime Access — $99'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Payments processed securely by Stripe.{' '}
          <button onClick={signOut} className="text-gray-500 hover:text-gray-400 underline">Sign out</button>
        </p>
      </div>
    </div>
  );
}