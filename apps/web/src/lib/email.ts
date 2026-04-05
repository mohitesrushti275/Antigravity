import { Resend } from 'resend';

// ═══════════════════════════════════════════════════
// EMAIL SERVICE (Resend)
// ═══════════════════════════════════════════════════

let resend: Resend | null = null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@21st.dev';

function getResend(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional email via Resend.
 * Fire-and-forget — logs errors but does not throw.
 * Returns false (no-op) if RESEND_API_KEY is not configured.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn(JSON.stringify({ level: 'warn', message: 'Email not sent — RESEND_API_KEY not configured', to: params.to }));
    return false;
  }

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (err) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to send email',
      to: params.to,
      subject: params.subject,
      error: err instanceof Error ? err.message : 'Unknown error',
    }));
    return false;
  }
}

// ═══════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════

export function componentApprovedEmail(componentName: string, url: string): { subject: string; html: string } {
  return {
    subject: `Your component "${componentName}" has been approved! 🎉`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Component Approved</h2>
        <p>Great news! Your component <strong>${componentName}</strong> has been reviewed and approved.</p>
        <p>It's now live on the 21st.dev registry and available for installation.</p>
        <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          View Component
        </a>
      </div>
    `,
  };
}

export function componentRejectedEmail(componentName: string, reason: string): { subject: string; html: string } {
  return {
    subject: `Update on your component "${componentName}"`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Component Review Update</h2>
        <p>Your component <strong>${componentName}</strong> was not approved at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>You can make changes and resubmit for review.</p>
      </div>
    `,
  };
}
