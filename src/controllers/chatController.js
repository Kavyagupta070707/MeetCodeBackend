import { streamClient } from "../lib/stream.js";

export async function getStreamtoken(req,res){
    try {
        const token = streamClient.createToken(req.user.clerkId)
        res.status(200).json({
            toke,
            userId: req.user.clerkId,
            username: req.user.name,
            userImage: req.user.image
        })
    } catch (error) {
        
    }
}