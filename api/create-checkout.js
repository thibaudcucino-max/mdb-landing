// api/create-checkout.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { priceId, plan } = req.body || {};
  if (!priceId) return res.status(400).json({ error: 'priceId manquant' });
  const SK = process.env.STRIPE_SECRET_KEY;
  if (!SK) return res.status(500).json({ error: 'Stripe non configure' });
  const params = new URLSearchParams({
    'mode': 'subscription',
    'payment_method_types[]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'subscription_data[trial_period_days]': '3',
    'success_url': 'https://gestop.fr/tarifs.html?checkout=success',
    'cancel_url': 'https://gestop.fr/tarifs.html',
    'allow_promotion_codes': 'true',
    'billing_address_collection': 'required',
  });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error && data.error.message || 'Stripe error');
    return res.status(200).json({ url: data.url });
  } catch(e) {
    console.error('[checkout]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
