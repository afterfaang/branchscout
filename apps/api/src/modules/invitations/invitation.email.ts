// Davet email template'i (Türkçe).

export interface InvitationEmailContext {
  recipientName: string;
  inviterName: string;
  inviterEmail: string;
  acceptUrl: string;
  expiresInHours: number;
}

export function buildInvitationEmail(ctx: InvitationEmailContext): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "BranchScout — Hesap Davetiniz";
  const text = `Merhaba ${ctx.recipientName},

${ctx.inviterName} (${ctx.inviterEmail}) sizi BranchScout uygulamasına davet etti.
Aşağıdaki linke tıklayarak parolanızı belirleyin ve hesabınızı oluşturun:

${ctx.acceptUrl}

Bu davet ${ctx.expiresInHours} saat geçerlidir. Süresi dolduktan sonra
yöneticinizden yeni bir davet talep etmeniz gerekir.

— BranchScout`;
  const html = `<!DOCTYPE html>
<html lang="tr">
<body style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
      <span style="display:inline-block;width:32px;height:32px;border-radius:6px;background:#2563eb;color:#fff;text-align:center;line-height:32px;font-weight:700;">B</span>
      <strong style="font-size:16px;">BranchScout</strong>
    </div>
    <h1 style="font-size:20px;margin:0 0 16px;">Hesap Davetiniz</h1>
    <p style="margin:0 0 12px;">Merhaba <strong>${escapeHtml(ctx.recipientName)}</strong>,</p>
    <p style="margin:0 0 16px;">
      ${escapeHtml(ctx.inviterName)} (${escapeHtml(ctx.inviterEmail)}) sizi BranchScout uygulamasına davet etti.
      Aşağıdaki butona tıklayarak parolanızı belirleyin ve hesabınızı oluşturun.
    </p>
    <p style="margin:24px 0;">
      <a href="${ctx.acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">Hesabımı Oluştur</a>
    </p>
    <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Buton çalışmazsa şu linki kullanın:</p>
    <p style="font-size:12px;word-break:break-all;color:#475569;margin:0 0 16px;">${escapeHtml(ctx.acceptUrl)}</p>
    <p style="font-size:12px;color:#64748b;margin:0;">Bu davet ${ctx.expiresInHours} saat geçerlidir.</p>
  </div>
</body>
</html>`;
  return { subject, text, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
