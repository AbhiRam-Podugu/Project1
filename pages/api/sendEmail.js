import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await sendgrid.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    });
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('SendGrid error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
