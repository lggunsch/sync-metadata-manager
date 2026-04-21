const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { priceId, userId, email } = req.body;
  const isLifetime = priceId === process.env.VITE_STRIPE_LIFETIME_PRICE_ID;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isLifetime ? 'payment' : 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      subscription_data: isLifetime ? undefined : {
        trial_period_days: 14,
        metadata: { userId },
      },
      success_url: `https://app.friedsodamusic.com/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://app.friedsodamusic.com/?payment=cancelled`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};