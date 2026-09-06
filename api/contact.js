export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nom, email, sujet, message } = req.body || {};
  if (!nom || !email || !sujet || !message) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const sujets = {
    demo: 'Demande de demo',
    acces: 'Acces anticipe',
    bug: 'Signaler un bug',
    question: 'Question sur le produit',
    tarif: 'Question sur les tarifs',
    autre: 'Autre',
  };

  const html = `<div style="font-family:sans-serif;max-width:500px;">
    <h2 style="color:#1C2B3A;">Nouveau message Gestop Contact</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px;font-weight:600;width:120px;">Nom</td><td style="padding:8px;">${nom}</td></tr>
      <tr style="background:#F7F6F2;"><td style="padding:8px;font-weight:600;">Email</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:8px;font-weight:600;">Sujet</td><td style="padding:8px;">${sujets[sujet] || sujet}</td></tr>
      <tr style="background:#F7F6F2;"><td style="padding:8px;font-weight:600;vertical-align:top;">Message</td><td style="padding:8px;">${message.replace(/\n/g, '<br>')}</td></tr>
    </table>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gestop Contact <onboarding@resend.dev>',
        to: ['thibaudcucinotta@demereenfilsmdb.fr'],
        reply_to: email,
        subject: '[Gestop] ' + (sujets[sujet] || sujet) + ' - ' + nom,
        html,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt);
    }
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('[contact]', e.message);
    return res.status(500).json({ error: 'Erreur envoi email' });
  }
}
