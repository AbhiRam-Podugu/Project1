// pages/api/sendRemainders.js
import { MongoClient } from "mongodb";
import sendgrid from "@sendgrid/mail";
import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_SUPABASE_URL= "https://vbbqmoazhxnklsnflzjn.supabase.com"
// SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiYnFtb2F6aHhua2xzbmZsempuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDUzMiwiZXhwIjoyMDczNjA2NTMyfQ.TnyXSOVPF35Ml6cX_nBiKPFfe3_nwV6f5_f6YXjnBXE

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const client = new MongoClient(process.env.MONGODB_URI);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 👈 service role required
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const silentHoursCollection = db.collection("silentHours");

    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
    const sixteenMinutesLater = new Date(now.getTime() + 16 * 60 * 1000);

    // 1️⃣ Get silent hours starting in ~15 min
    const silentHours = await silentHoursCollection
      .find({
        startTime: {
          $gte: fifteenMinutesLater,
          $lt: sixteenMinutesLater,
        },
      })
      .toArray();

    if (!silentHours.length) {
      return res
        .status(200)
        .json({ message: "No silent hours starting in 15 minutes." });
    }

    // 2️⃣ Get user email from Supabase Auth
    const emailPromises = silentHours.map(async ({ userId, startTime }) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data?.user?.email) {
        console.warn(`No Supabase user found for userId ${userId}`);
        return null;
      }

      const email = data.user.email;

      // 3️⃣ Send reminder email
      return sendgrid.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Reminder: Silent Hour Starting Soon",
        text: `Your silent hour starts at ${new Date(
          startTime
        ).toLocaleString()}. Please be prepared.`,
      });
    });

    await Promise.all(emailPromises);

    return res
      .status(200)
      .json({ message: `Sent ${emailPromises.length} reminder email(s).` });
  } catch (err) {
    console.error("Unexpected error:", JSON.stringify(err, null, 2));
    return res.status(500).json({ error: "Unexpected error occurred" });
  } finally {
    await client.close();
  }
}
