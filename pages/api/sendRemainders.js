import { supabase } from '../../src/lib/supabaseClient';
import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const now = new Date();
    const reminderTimeStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    const reminderTimeEnd = new Date(reminderTimeStart.getTime() + 60 * 1000); // 1 minute window

    // Query silent hours starting between reminderTimeStart and reminderTimeEnd
    const { data: silentHours, error } = await supabase
      .from('silentHours')
      .select('startTime,endTime,user(email)')
      .gte('startTime', reminderTimeStart.toISOString())
      .lt('startTime', reminderTimeEnd.toISOString());

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch silent hours' });
    }

    if (!silentHours || silentHours.length === 0) {
      return res.status(200).json({ message: 'No silent hours starting soon.' });
    }

    // Send reminder email for each silent hour found
    const emailPromises = silentHours.map(({ user, startTime }) =>
      sendgrid.send({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Reminder: Silent Hour Starting Soon',
        text: `Your silent hour starts at ${new Date(startTime).toLocaleString()}. Please prepare.`,
      })
    );

    await Promise.all(emailPromises);

    return res.status(200).json({ message: `Sent ${emailPromises.length} reminder emails.` });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
