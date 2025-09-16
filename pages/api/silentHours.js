import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db();  // Use default database from connection string
  const collection = db.collection("silent_hours");

  if (req.method === "GET") {
    // Get userId from query params
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    try {
      const silentHours = await collection
        .find({ userId })
        .sort({ startTime: 1 })
        .toArray();
      return res.status(200).json(silentHours);
    } catch (err) {
      return res.status(500).json({ error: "Failed to get silent hours" });
    }
  } else if (req.method === "POST") {
    const { userId, startTime, endTime } = req.body;

    if (!userId || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate start/end time
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    try {
      // Check for overlapping silent hours for same user
      const overlapping = await collection.findOne({
        userId,
        $or: [
          { startTime: { $lt: end, $gte: start } },
          { endTime: { $gt: start, $lte: end } },
          { startTime: { $lte: start }, endTime: { $gte: end } },
        ],
      });
      if (overlapping) {
        return res.status(409).json({ error: "Overlapping silent hour exists" });
      }

      // Insert new silent hour
      const result = await collection.insertOne({
        userId,
        startTime: start,
        endTime: end,
        createdAt: new Date(),
      });

      return res.status(201).json({
        _id: result.insertedId,
        userId,
        startTime: start,
        endTime: end,
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to schedule silent hour" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
