import Session from "../models/Session.js";

function generateSessionCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return code;
}

async function createUniqueSessionCode() {
    for (let attempt = 0; attempt < 5; attempt++) {
        const sessionCode = generateSessionCode();
        const existingSession = await Session.exists({ sessionCode });

        if (!existingSession) return sessionCode;
    }

    throw new Error("Unable to generate a unique session code");
}

export async function createSession(req,res){ 
    try {
        const {problem, difficulty}= req.body;
        const userId= req.user._id

        if(!problem || !difficulty){
            return res.status(400).json({ message: "Problem and difficulty are required to create a session" })
        }

        const callId  = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const sessionCode = await createUniqueSessionCode();

        const session = await Session.create({
            problemTitle: problem,
            difficulty,
            host: userId,
            sessionCode,
            callId
        })

        res.status(201).json({ session: session });
    } catch (error) {
        console.error("Error in session controller",error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getActiveSessions(req,res){ 
    try {
        const userId = req.user._id;
        const activeSessions = await Session.find({
            status: "active",
            $or:[{ host: userId }, { participant: userId }]
        })
        .populate("host", "name profileImage clerkId email")
        .populate("participant", "name profileImage clerkId email")
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
            $or:[{ host: userId }, { participant: userId }] })
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
        const userId = req.user._id;

        const session = await Session.findById(id)
        .populate("host", "name profileImage clerkId email")
        .populate("participant", "name profileImage clerkId email");

        if(!session){
            return res.status(404).json({ message: "Session not found" })
        }

        const isHost = session.host?._id?.toString() === userId.toString();
        const isParticipant = session.participant?._id?.toString() === userId.toString();

        if(!isHost && !isParticipant){
            return res.status(403).json({ message: "Enter the session code to join this session" })
        }

        res.status(200).json({ session });
    } catch (error) {
        console.error("Error in getSessionById controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function joinSessionByCode(req,res){
    try {
        const { sessionCode } = req.body;
        const userId = req.user._id;
        const normalizedCode = sessionCode?.trim().toUpperCase();

        if(!normalizedCode){
            return res.status(400).json({ message: "Session code is required" })
        }

        const session = await Session.findOne({ sessionCode: normalizedCode });

        if(!session){
            return res.status(404).json({ message: "Session not found" })
        }

        if(session.status === "completed"){
            return res.status(400).json({ message: "Cannot join a completed session" })
        }

        if(session.host.toString() === userId.toString()){
            const hostSession = await Session.findById(session._id)
            .populate("host", "name profileImage clerkId email")
            .populate("participant", "name profileImage clerkId email");

            return res.status(200).json({ session: hostSession });
        }

        if(session.participant && session.participant.toString() !== userId.toString()){
            return res.status(400).json({ message: "Session already has a participant" })
        }

        if(!session.participant){
            session.participant = userId;
            await session.save();
        }

        const joinedSession = await Session.findById(session._id)
        .populate("host", "name profileImage clerkId email")
        .populate("participant", "name profileImage clerkId email");

        res.status(200).json({ session: joinedSession });
    } catch (error) {
        console.error("Error in joinSessionByCode controller", error);
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

        session.status = "completed";
        await session.save();
        res.status(200).json({ message: "Session ended successfully" });
    } catch (error) {
        console.error("Error in endSession controller", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
