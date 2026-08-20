import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import User from "../src/models/User.js";

function buildBackfilledHistory(user) {
  const currentRating = user.rating ?? 1000;
  const history = [
    {
      rating: 1000,
      change: 0,
      reason: "initial",
      createdAt: user.createdAt || new Date(),
    },
  ];

  if (currentRating !== 1000) {
    history.push({
      rating: currentRating,
      change: currentRating - 1000,
      reason: currentRating > 1000 ? "win" : "loss",
      createdAt: user.updatedAt || new Date(),
    });
  }

  return history;
}

async function backfillRatingHistory() {
  await connectDB();

  const users = await User.find({
    $or: [
      { ratingHistory: { $exists: false } },
      { ratingHistory: { $size: 0 } },
      {
        rating: { $ne: 1000 },
        "ratingHistory.0.reason": "initial",
        $expr: { $eq: [{ $size: "$ratingHistory" }, 1] },
      },
    ],
  });

  let fixedCount = 0;

  for (const user of users) {
    user.ratingHistory = buildBackfilledHistory(user);
    await user.save();
    fixedCount += 1;
  }

  console.log(`Backfilled rating history for ${fixedCount} users.`);

  await mongoose.disconnect();
}

backfillRatingHistory().catch(async (error) => {
  console.error("Failed to backfill rating history", error);
  await mongoose.disconnect();
  process.exit(1);
});
