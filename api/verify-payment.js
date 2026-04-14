import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      const userId = session.metadata.userId;
      const isLifetime = session.mode === 'payment';

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        status: 'active',
        plan: isLifetime ? 'lifetime' : 'monthly',
        stripe_customer_id: session.customer,
        updated_at: new Date().toISOString(),
      });

      res.status(200).json({ active: true });
    } else {
      res.status(200).json({ active: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}