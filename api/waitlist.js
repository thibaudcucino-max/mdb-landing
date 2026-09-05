// api/waitlist.js — inscriptions liste d'attente MDB
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { email } = req.body || {};
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Email invalide" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const toEmail   = process.env.CONTACT_EMAIL || "thibaudcucino@gmail.com";
  const fromEmail = process.env.FROM_EMAIL    || "onboarding@resend.dev";

  if (!resendKey) {
    console.error("RESEND_API_KEY manquante");
    return res.status(500).json({ error: "Configuration serveur incomplète" });
  }

  try {
    // Notif email via Resend
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `🔔 Nouvelle inscription liste d'attente MDB — ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#191917;margin-bottom:8px">Nouvelle inscription</h2>
            <p style="color:#555;margin-bottom:16px">Un visiteur vient de rejoindre la liste d'attente MDB.</p>
            <table style="border-collapse:collapse;width:100%;background:#f9f9f7;border-radius:8px">
              <tr>
                <td style="padding:12px 16px;color:#888;font-size:13px;width:80px">Email</td>
                <td style="padding:12px 16px;font-weight:600;color:#191917">
                  <a href="mailto:${email}" style="color:#7D721A">${email}</a>
                </td>
              </tr>
              <tr style="border-top:1px solid #e5e4df">
                <td style="padding:12px 16px;color:#888;font-size:13px">Date</td>
                <td style="padding:12px 16px;color:#555;font-size:13px">
                  ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
                </td>
              </tr>
            </table>
            <p style="color:#aaa;font-size:11px;margin-top:20px">
              SAS De Mère en Fils MDB · site-mdb7.vercel.app
            </p>
          </div>
        `
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Resend error:", err);
      return res.status(500).json({ error: "Erreur envoi email" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Waitlist error:", e);
    return res.status(500).json({ error: e.message });
  }
}
