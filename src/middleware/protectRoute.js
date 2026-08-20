import User from "../models/User.js";
import { connectDB } from "../lib/db.js";

export const protectRoute = async (req, res, next) => {
  try {
    // clerkMiddleware() already ran, so req.auth should be available.
    const userId = req.auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - No valid session" });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.rating === undefined || user.rating === null) {
      user.rating = 1000;
    }

    if (!user.ratingHistory || user.ratingHistory.length === 0) {
      const currentRating = user.rating ?? 1000;
      user.ratingHistory = [
        {
          rating: 1000,
          change: 0,
          reason: "initial",
          createdAt: user.createdAt || new Date(),
        },
      ];

      if (currentRating !== 1000) {
        user.ratingHistory.push({
          rating: currentRating,
          change: currentRating - 1000,
          reason: currentRating > 1000 ? "win" : "loss",
          createdAt: user.updatedAt || new Date(),
        });
      }
    } else if (
      user.ratingHistory.length === 1 &&
      user.rating !== 1000 &&
      user.ratingHistory[0]?.reason === "initial" &&
      user.ratingHistory[0]?.rating === user.rating
    ) {
      const currentRating = user.rating;
      user.ratingHistory = [
        {
          rating: 1000,
          change: 0,
          reason: "initial",
          createdAt: user.createdAt || new Date(),
        },
        {
          rating: currentRating,
          change: currentRating - 1000,
          reason: currentRating > 1000 ? "win" : "loss",
          createdAt: user.updatedAt || new Date(),
        },
      ];
    }

    if (user.isModified("rating") || user.isModified("ratingHistory")) {
      await user.save();
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
