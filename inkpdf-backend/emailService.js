import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM || 'InkPDF <onboarding@resend.dev>';

/**
 * Sends a ZAR payment receipt after a successful Walletdoc transaction.
 */
export async function sendPaymentReceiptEmail({
  toEmail,
  transactionId,
  reference,
  amountZar = 'R150.00',
  planName = 'InkPDF Pro (Monthly)',
}) {
  if (!toEmail || !process.env.RESEND_API_KEY) return;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [toEmail],
    subject: `InkPDF Receipt - ${reference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #4f46e5;">InkPDF Payment Receipt</h2>
        <p>Thank you for subscribing to <strong>${planName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Amount Paid</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${amountZar} (ZAR)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Reference</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${reference}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Transaction ID</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${transactionId}</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #64748b;">
          Client-side WASM document processing remains active with no daily operation cap.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send payment receipt email:', error);
  }
  return data;
}

/**
 * Sends a formal POPIA data erasure confirmation certificate upon account deletion.
 */
export async function sendPopiaErasureCertificate({ toEmail, userId, deletedAt = new Date() }) {
  if (!toEmail || !process.env.RESEND_API_KEY) return;

  const certificateId = `POPIA-DEL-${userId}-${Date.now()}`;
  const formattedDate = deletedAt.toISOString();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [toEmail],
    subject: `POPIA Data Erasure Certificate - ${certificateId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #4f46e5;">POPIA Personal Information Erasure Certificate</h2>
        <p>
          This notice confirms that your InkPDF account and associated personal records stored in our database
          have been permanently deleted in accordance with the Protection of Personal Information Act (POPIA).
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Certificate ID</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${certificateId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Account Email</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Erasure Timestamp (UTC)</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${formattedDate}</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #64748b;">
          If you did not request this deletion, please contact InkPDF support immediately.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send POPIA erasure certificate:', error);
  }
  return data;
}