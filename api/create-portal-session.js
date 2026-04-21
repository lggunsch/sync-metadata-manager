const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userId } = req.body;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (error || !data?.stripe_customer_id || data.stripe_customer_id === 'manual') {
    return res.status(400).json({ error: 'No billing account found.' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: 'https://app.friedsodamusic.com',
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};