const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const subscription = event.data.object;

  switch (event.type) {
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
      await supabase.from('subscriptions')
        .update({ status: 'inactive' })
        .eq('stripe_customer_id', subscription.customer);
      break;
    case 'customer.subscription.resumed':
    case 'invoice.payment_succeeded':
      await supabase.from('subscriptions')
        .update({ status: 'active' })
        .eq('stripe_customer_id', subscription.customer);
      break;
  }

  res.status(200).json({ received: true });
};