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
    
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
