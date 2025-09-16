import { supabase } from '../../lib/supabaseClient'; // or your DB client
import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const now = new Date();
  const reminderTimeStart = new Date(now.getTime() + 10 * 60 * 1000);
  const reminderTimeEnd = new Date(reminderTimeStart.getTime() + 60 * 1000); // 1 min window

  // Query silent hours where startTime is between reminderTimeStart and reminderTimeEnd

  const { data: silentHours, error } = await supabase
    .from('silentHours')
    .select('startTime,endTime,user(email)')
    .gte('startTime', reminderTimeStart.toISOString())
    .lt('startTime', reminderTimeEnd.toISOString());

  if (error) {
    console.error('DB error', error);
    return res.status(500).json({ error: 'DB query failed' });
  }

  // Send emails for each silent hour
  const emailPromises = silentHours.map(({ user, startTime }) => {
    return sendgrid.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Reminder: Silent Hour Starting Soon',
      text: `Your silent hour starts at ${new Date(startTime).toLocaleString()}. Please prepare.`,
    });
  });

  await Promise.all(emailPromises);

  res.status(200).json({ message: `Sent ${emailPromises.length} reminder emails` });
}
