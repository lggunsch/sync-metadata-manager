import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { priceId, userId, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: priceId === process.env.VITE_STRIPE_LIFETIME_PRICE_ID ? 'payment' : 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      success_url: `https://app.friedsodamusic.com/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://app.friedsodamusic.com/?payment=cancelled`,
    });

    res.status(200).json({ url: session.url });
 } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }