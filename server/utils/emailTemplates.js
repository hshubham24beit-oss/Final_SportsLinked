function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ heading, intro, ctaLabel, ctaUrl, note, footerNote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0b1b2b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0b1b2b;">SportLinked</span>
                <span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#eef6f7;color:#1f6f7a;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Sport careers</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b1b2b;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52606d;">${escapeHtml(intro)}</p>
                <a href="${ctaUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#1f6f7a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                <p style="margin:24px 0 8px;font-size:12px;line-height:1.6;color:#7b8794;">${escapeHtml(note)}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#7b8794;word-break:break-all;">${escapeHtml(ctaUrl)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafb;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#7b8794;">${escapeHtml(footerNote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function verificationEmail({ name, verificationUrl }) {
  const heading = 'Verify your email address';
  const intro = `Hello ${name}, welcome to SportLinked. Confirm your email address to secure your account and unlock verified account features.`;
  const note = 'This link expires in 24 hours. If you did not create a SportLinked account, you can safely ignore this email.';

  return {
    subject: 'Verify your SportLinked email',
    html: layout({
      heading,
      intro,
      ctaLabel: 'Verify email',
      ctaUrl: verificationUrl,
      note,
      footerNote: 'SportLinked helps athletes, coaches, and recruiters build credible sporting careers.',
    }),
    text: `${heading}\n\n${intro}\n\nVerify your email: ${verificationUrl}\n\n${note}\n\nSportLinked`,
  };
}

function passwordResetEmail({ name, resetUrl }) {
  const heading = 'Reset your password';
  const intro = `Hello ${name}, we received a request to reset the password for your SportLinked account. Use the button below to choose a new password.`;
  const note = 'This link expires in 1 hour and can be used once. If you did not request a reset, you can safely ignore this email; your password will not change.';

  return {
    subject: 'Reset your SportLinked password',
    html: layout({
      heading,
      intro,
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      note,
      footerNote: 'For your security, SportLinked will never ask you for your password by email.',
    }),
    text: `${heading}\n\n${intro}\n\nReset your password: ${resetUrl}\n\n${note}\n\nSportLinked`,
  };
}

function notificationEmail({ name, heading, intro, notificationUrl }) {
  return {
    subject: `SportLinked: ${heading}`,
    html: layout({
      heading,
      intro: `Hello ${name}, ${intro}`,
      ctaLabel: 'View in SportLinked',
      ctaUrl: notificationUrl,
      note: 'You can change which email notifications you receive in Account settings.',
      footerNote: 'SportLinked helps athletes, coaches, and recruiters build credible sporting careers.',
    }),
    text: `${heading}\n\nHello ${name}, ${intro}\n\nView in SportLinked: ${notificationUrl}\n\nYou can change which email notifications you receive in Account settings.\n\nSportLinked`,
  };
}

module.exports = { verificationEmail, passwordResetEmail, notificationEmail };
