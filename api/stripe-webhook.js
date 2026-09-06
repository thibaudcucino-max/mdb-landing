// api/stripe-webhook.js
// Reçoit checkout.session.completed → crée un code d'invitation → envoie par email

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GESTOP-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function supabaseInsert(url, key, table, data) {
  const r = await fetch(url + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  return r;
}

async function sendEmail(resendKey, to, code, plan) {
  const planNames = { solo: 'Solo', pro: 'Pro', cabinet: 'Cabinet' };
  const planName = planNames[plan] || 'Gestop';
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F7F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="background:linear-gradient(135deg,#1C2B3A,#2D4A6B);border-radius:14px 14px 0 0;padding:28px 32px;">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;">Gestop</div>
      <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px;">Bienvenue dans votre espace</div>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #E8E6E0;border-top:none;">
      <h2 style="font-size:22px;font-weight:800;color:#1C2B3A;margin:0 0 12px;">Votre accès Gestop ${planName} est prêt !</h2>
      <p style="font-size:14px;color:#3D5166;margin:0 0 24px;line-height:1.6;">
        Merci pour votre abonnement. Voici votre code d'accès personnel pour créer votre compte Gestop.
      </p>
      
      <div style="background:#F0EEE8;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#8B9BAD;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Votre code d'invitation</div>
        <div style="font-size:28px;font-weight:800;color:#1C2B3A;letter-spacing:.05em;font-family:monospace;">${code}</div>
      </div>
      
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://mdb-simulateur-tau.vercel.app" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#1C2B3A;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
          Accéder à Gestop →
        </a>
      </div>
      
      <div style="background:#FEF3C7;border-radius:8px;padding:16px;font-size:13px;color:#92400E;">
        <strong>Comment utiliser votre code :</strong><br>
        1. Cliquez sur "Créer un compte"<br>
        2. Saisissez votre email et mot de passe<br>
        3. Entrez le code ci-dessus<br>
        4. Acceptez les CGU et c'est parti !
      </div>
    </div>
    <div style="background:#E8E6E0;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center;">
      <p style="font-size:11px;color:#8B9BAD;margin:0;">
        Gestop — SAS De Mère en Fils MDB<br>
        <a href="https://gestop.fr" style="color:#8B9BAD;">gestop.fr</a> · <a href="mailto:thibaudcucinotta@demereenfilsmdb.fr" style="color:#8B9BAD;">Contact</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Gestop <contact@gestop.fr>',
      to: [to],
      subject: 'Votre code d acces Gestop ' + planName + ' - ' + code,
      html,
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SK = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtygnsrbinrvedicjoeb.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  const rawBody = await getRawBody(req);
  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch(e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const priceId = session.line_items?.data?.[0]?.price?.id;
    
    // Déterminer le plan depuis les metadata ou le price ID
    const plan = session.metadata?.plan || 'pro';
    
    if (customerEmail) {
      // Générer un code unique
      const code = generateCode();
      
      // Créer le code dans Supabase
      if (SUPABASE_SERVICE_KEY) {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        
        await supabaseInsert(SUPABASE_URL, SUPABASE_SERVICE_KEY, 'invitations', {
          code,
          email: customerEmail,
          max_uses: 1,
          use_count: 0,
          expires_at: expires.toISOString(),
          created_at: new Date().toISOString(),
        });
      }
      
      // Envoyer l'email avec le code
      if (RESEND_KEY) {
        await sendEmail(RESEND_KEY, customerEmail, code, plan);
      }
      
      console.log('[webhook] Code created:', code, 'for:', customerEmail);
    }
  }

  return res.status(200).json({ received: true });
}
