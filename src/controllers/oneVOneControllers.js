import Session from "../models/Session.js";
import { getRandomProblemByDifficulty } from "../data/problems.js";

const MATCH_DURATION_MS = 15 * 60 * 1000;
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

function createCallId() {
  return `one_v_one_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function normalizeDifficulty(difficulty) {
  return difficulty?.trim().toLowerCase();
}

async function populateOneVOneSession(sessionId) {
  return Session.findById(sessionId)
    .populate("host", "name profileImage clerkId email")
    .populate("participant", "name profileImage clerkId email")
    .populate("winner", "name profileImage clerkId email")
    .populate("loser", "name profileImage clerkId email");
}

async function completeExpiredOneVOneSessions() {
  await Session.updateMany(
    {
      mode: "one-v-one",
      status: "active",
      endsAt: { $lte: new Date() },
      winner: null,
    },
    {
      $set: {
        status: "completed",
        result: "draw",
        completedAt: new Date(),
      },
    }
  );
}

export async function matchOneVOneSession(req, res) {
  try {
    await completeExpiredOneVOneSessions();

    const difficulty = normalizeDifficulty(req.body.difficulty);
    const userId = req.user._id;

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ message: "Valid difficulty is required" });
    }

    const existingSession = await Session.findOne({
      mode: "one-v-one",
      status: { $in: ["waiting", "active"] },
      $or: [{ host: userId }, { participant: userId }],
    }).sort({ createdAt: -1 });

    if (existingSession) {
      const session = await populateOneVOneSession(existingSession._id);
      return res.status(200).json({ session });
    }

    const startTime = new Date();
    const matchedSession = await Session.findOneAndUpdate(
      {
        mode: "one-v-one",
        difficulty,
        status: "waiting",
        participant: null,
        host: { $ne: userId },
      },
      {
        $set: {
          participant: userId,
          status: "active",
          startedAt: startTime,
          endsAt: new Date(startTime.getTime() + MATCH_DURATION_MS),
        },
      },
      { new: true, sort: { createdAt: 1 } }
    );

    if (matchedSession) {
      const session = await populateOneVOneSession(matchedSession._id);
      return res.status(200).json({ session });
    }

    const problem = getRandomProblemByDifficulty(difficulty);

    if (!problem) {
      return res.status(400).json({ message: "No problems are available for this difficulty" });
    }

    const session = await Session.create({
      mode: "one-v-one",
      problemTitle: problem.title,
      difficulty,
      host: userId,
      status: "waiting",
      callId: createCallId(),
    });

    const populatedSession = await populateOneVOneSession(session._id);
    return res.status(201).json({ session: populatedSession });
  } catch (error) {
    console.error("Error in matchOneVOneSession controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOneVOneSessionById(req, res) {
  try {
    await completeExpiredOneVOneSessions();

    const { id } = req.params;
    const userId = req.user._id;
    const session = await populateOneVOneSession(id);

    if (!session || session.mode !== "one-v-one") {
      return res.status(404).json({ message: "1v1 session not found" });
    }

    const isHost = session.host?._id?.toString() === userId.toString();
    const isParticipant = session.participant?._id?.toString() === userId.toString();

    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "You are not part of this 1v1 session" });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error("Error in getOneVOneSessionById controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function submitOneVOneWin(req, res) {
  try {
    await completeExpiredOneVOneSessions();

    const { id } = req.params;
    const userId = req.user._id;
    const session = await Session.findById(id);

    if (!session || session.mode !== "one-v-one") {
      return res.status(404).json({ message: "1v1 session not found" });
    }

    const isHost = session.host?.toString() === userId.toString();
    const isParticipant = session.participant?.toString() === userId.toString();

    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "You are not part of this 1v1 session" });
    }

    if (session.status !== "active") {
      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(400).json({ message: "Match is not active", session: populatedSession });
    }

    if (!session.participant) {
      return res.status(400).json({ message: "Match has not started yet" });
    }

    if (session.endsAt && session.endsAt <= new Date()) {
      session.status = "completed";
      session.result = "draw";
      session.completedAt = new Date();
      await session.save();

      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(400).json({ message: "Match time is over", session: populatedSession });
    }

    const loserId = isHost ? session.participant : session.host;

    session.winner = userId;
    session.loser = loserId;
    session.result = "winner";
    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    const populatedSession = await populateOneVOneSession(session._id);
    return res.status(200).json({ session: populatedSession });
  } catch (error) {
    console.error("Error in submitOneVOneWin controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
