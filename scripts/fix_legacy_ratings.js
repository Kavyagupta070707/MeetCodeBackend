import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import User from "../src/models/User.js";

async function fixLegacyRatings() {
  await connectDB();

  const missingRatingResult = await User.updateMany(
    {
      $or: [{ rating: { $exists: false } }, { rating: null }],
    },
    {
      $set: { rating: 1000 },
    }
  );

  const legacyRatingResult = await User.updateMany(
    {
      rating: { $gte: -100, $lte: 100 },
    },
    {
      $inc: { rating: 1000 },
    }
  );

  console.log(
    `Initialized missing ratings: ${missingRatingResult.modifiedCount}. Fixed legacy ratings: ${legacyRatingResult.modifiedCount}.`
  );

  await mongoose.disconnect();
}

fixLegacyRatings().catch(async (error) => {
  console.error("Failed to fix legacy ratings", error);
  await mongoose.disconnect();
  process.exit(1);
});
