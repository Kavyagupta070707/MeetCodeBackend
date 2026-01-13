import { streamClient } from "../lib/stream.js";

export async function getStreamtoken(req,res){
    try {
         if (!req.user || !req.user.clerkId) {
            return res.status(401).json({ error: "Unauthorized - User not authenticated" });
        }

        const token = streamClient.createToken(req.user.clerkId)
        res.status(200).json({
            token,
            userId: req.user.clerkId,
            username: req.user.name,
            userImage: req.user.image
        })
    } catch (error) {
         console.error("Error generating Stream token:", error);
        res.status(500).json({ 
            error: "Failed to generate Stream token",
            message: error.message 
        });
    }
}