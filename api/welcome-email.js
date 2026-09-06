// api/welcome-email.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email manquant' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Resend non configure' });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F7F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="background:linear-gradient(135deg,#1C2B3A,#2D4A6B);border-radius:14px 14px 0 0;padding:28px 32px;">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">Gestop</div>
      <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px;">Bienvenue !</div>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #E8E6E0;border-top:none;">
      <h2 style="font-size:22px;font-weight:800;color:#1C2B3A;margin:0 0 12px;">Votre compte Gestop est actif</h2>
      <p style="font-size:14px;color:#3D5166;margin:0 0 20px;line-height:1.6;">
        Bienvenue sur Gestop ! Votre espace de gestion pour marchands de biens est pret.
      </p>

      <div style="background:#F0EEE8;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#1C2B3A;margin-bottom:12px;">Pour bien demarrer :</div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
          <div style="background:#1C2B3A;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">1</div>
          <div style="font-size:13px;color:#3D5166;">Creez votre premiere operation (adresse, type de bien, prix acquisition)</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
          <div style="background:#1C2B3A;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">2</div>
          <div style="font-size:13px;color:#3D5166;">Lancez une simulation financiere pour calculer votre marge nette</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="background:#1C2B3A;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">3</div>
          <div style="font-size:13px;color:#3D5166;">Analysez les ventes DVF autour de votre bien pour valider votre prix de sortie</div>
        </div>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://mdb-simulateur-tau.vercel.app" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#1C2B3A;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
          Ouvrir Gestop
        </a>
      </div>

      <p style="font-size:13px;color:#8B9BAD;text-align:center;margin:0;">
        Une question ? Repondez a cet email ou ecrivez-nous a<br>
        <a href="mailto:thibaudcucinotta@demereenfilsmdb.fr" style="color:#0E7490;">thibaudcucinotta@demereenfilsmdb.fr</a>
      </p>
    </div>
    <div style="background:#E8E6E0;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center;">
      <p style="font-size:11px;color:#8B9BAD;margin:0;">
        Gestop - SAS De Mere en Fils MDB<br>
        <a href="https://gestop.fr" style="color:#8B9BAD;">gestop.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Gestop <contact@gestop.fr>',
        to: [email],
        subject: 'Bienvenue sur Gestop - votre espace est pret',
        html,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('[welcome-email]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
