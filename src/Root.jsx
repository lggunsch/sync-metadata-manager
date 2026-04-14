import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import App from "./App";
import Auth from "./Auth";
import Paywall from "./Paywall";

export default function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAccess(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAccess(session.user.id);
      else { setHasAccess(false); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAccess = async (userId) => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      const sessionId = params.get('session_id');
      if (sessionId) {
        await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }
      window.history.replaceState({}, '', '/');
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single();

    setHasAccess(data?.status === 'active');
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
      Loading...
    </div>
  );

  if (!session) return <Auth />;
  if (!hasAccess) return <Paywall session={session} />;
  return <App session={session} />;
}