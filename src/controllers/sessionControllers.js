import { streamClient, videoclient } from "../lib/stream.js";
import Session from "../models/Session.js";

export async function createSession(req,res){ 
    try {
        const {problem, difficulty}= req.body;
        const userId= req.user._id
        const clerkId= req.user.clerkId

        if(!problem || !difficulty){
            return res.status(400).json({ message: "Problem and difficulty are required to create a session" })
        }

        const callId  = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const session = await Session.create({
            problemTitle: problem,
            difficulty,
            host: userId,
            callId
        })

        await videoclient.video.call("default", callId).getOrCreate({
            data:{
                created_by_id: clerkId,
                custom:{ problem, difficulty, sessionId: session._id.toString() }
            }
        });

        const channel = streamClient.channel("messaging", callId, {
            name: `${problem} Session`,
            members: [clerkId],
            created_by_id: clerkId,
        });

        await channel.create();

        res.status(201).json({ session: session });
    } catch (error) {
        console.error("Error in session controller",error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getActiveSessions(req,res){ 
    try {
        const activeSessions = await Session.find({ status: "active"})
        .populate("host", "name profileImage clerkId email")
        .sort({ createdAt: -1 })
        .limit(20);
        res.status(200).json({ sessions: activeSessions });
    } catch (error) {
        console.error("Error in getActiveSessions controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getPastSessions(req,res){ 
    try {
        const userId = req.user._id;
        const pastSessions = await Session.find({ status: "completed", 
            $or:[{ host: userId }, { participants: userId }] })
        .populate("host", "name profileImage clerkId email")
        .sort({ createdAt: -1 })
        .limit(20);
        res.status(200).json({ sessions: pastSessions });
    } catch (error) {
        console.error("Error in getActiveSessions controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getSessionById(req,res){ 
    try {
        const {id}= req.params;

        const session = await Session.findById(id)
        .populate("host", "name profileImage clerkId email")
        .populate("participant", "name profileImage clerkId email");

        if(!session){
            return res.status(404).json({ message: "Session not found" })
        }
        res.status(200).json({ session });
    } catch (error) {
        console.error("Error in getSessionById controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
export async function joinSession(req,res){ 
    try {
        const {id}= req.params;

        const userId = req.user._id;
        const clerkId= req.user.clerkId
        const session = await Session.findById(id);

        if(!session){
            return res.status(404).json({ message: "Session not found" })
        }

        if(session.status === "completed"){
            return res.status(400).json({ message: "Cannot join a completed session" })
        }
        if(session.host.toString() === userId.toString()){
            return res.status(400).json({ message: "Host cannot join their own session as participant" })
        }
        if(session.participant){
            return res.status(400).json({ message: "Session already has a participant" })
        }
        session.participant = userId;
        await session.save();

        const channel = streamClient.channel("messaging", session.callId);
        await channel.addMembers([clerkId]);
        res.status(200).json({ session });
    } catch (error) {
        console.error("Error in joinSession controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function endSession(req,res){ 
    try {
        const {id}= req.params;

        const userId = req.user._id;

        const session = await Session.findById(id);

        if(!session){
            return res.status(404).json({ message: "Session not found" })
        }

        if(session.host.toString() !== userId.toString()){
            return res.status(403).json({ message: "Only the host can end the session" })
        }

        if(session.status === "completed"){
            return res.status(400).json({ message: "Session is already completed" })
        }

        

        // delete stream video call
        await videoclient.video.call("default", session.callId).delete({ hard: true });

        // delete stream chat channel
        const channel = streamClient.channel("messaging", session.callId);
        await channel.delete();

        session.status = "completed";
        await session.save();
        res.status(200).json({ message: "Session ended successfully" });
    } catch (error) {
        console.error("Error in endSession controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}