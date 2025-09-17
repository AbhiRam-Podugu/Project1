// pages/api/sendRemainders.js

import { createClient } from '@supabase/supabase-js';
import sendgrid from '@sendgrid/mail';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    const elevenMinutesLater = new Date(now.getTime() + 11 * 60 * 1000); // 1 minute window

    const { data: silentHours, error } = await supabase
      .from('silentHours')
      .select('startTime,endTime,user(email)')
      .gte('startTime', tenMinutesLater.toISOString())
      .lt('startTime', elevenMinutesLater.toISOString());

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch silent hours' });
    }

    if (!silentHours || silentHours.length === 0) {
      return res.status(200).json({ message: 'No silent hours starting in 10 minutes.' });
    }

    // Send emails for each silent hour
    const emailPromises = silentHours.map(({ user, startTime }) => {
      return sendgrid.send({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Reminder: Silent Hour Starting Soon',
        text: `Your silent hour starts at ${new Date(startTime).toLocaleString()}. Please be prepared.`,
      });
    });

    await Promise.all(emailPromises);

    return res.status(200).json({ message: `Sent ${emailPromises.length} reminder email(s).` });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error occurred' });
  }
}
