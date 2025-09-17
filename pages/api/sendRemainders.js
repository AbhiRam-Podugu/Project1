// pages/api/sendRemainders.js
import { MongoClient } from "mongodb";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB); // database name
    const silentHoursCollection = db.collection("silentHours");

    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

    // Find docs starting 15 mins from now
    const silentHours = await silentHoursCollection
      .find({ startTime: fifteenMinutesLater.toISOString() })
      .toArray();

    if (!silentHours || silentHours.length === 0) {
      return res.status(200).json({ message: "No silent hours starting in 15 minutes." });
    }

    const emailPromises = silentHours.map(({ email, startTime }) =>
      sendgrid.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Reminder: Silent Hour Starting Soon",
        text: `Your silent hour starts at ${new Date(startTime).toLocaleString()}. Please be prepared.`,
      })
    );

    await Promise.all(emailPromises);

    return res.status(200).json({ message: `Sent ${emailPromises.length} reminder email(s).` });
  } catch (err) {
    console.error("Unexpected error:", JSON.stringify(err, null, 2));
    return res.status(500).json({ error: "Unexpected error occurred" });
  } finally {
    await client.close();
  }
}
