import Session from "../models/Session.js";
import User from "../models/User.js";
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
    .populate("host", "name profileimage profileImage clerkId email rating")
    .populate("participant", "name profileimage profileImage clerkId email rating")
    .populate("winner", "name profileimage profileImage clerkId email rating")
    .populate("loser", "name profileimage profileImage clerkId email rating");
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
        resultReason: "timeout",
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

    const activeSession = await Session.findOne({
      mode: "one-v-one",
      status: "active",
      $or: [{ host: userId }, { participant: userId }],
    }).sort({ createdAt: -1 });

    if (activeSession) {
      const session = await populateOneVOneSession(activeSession._id);
      return res.status(200).json({ session });
    }

    const previousWaitingSession = await Session.findOne({
      mode: "one-v-one",
      status: "waiting",
      host: userId,
      participant: null,
      difficulty,
    }).sort({ createdAt: -1 });

    await Session.updateMany(
      {
        mode: "one-v-one",
        status: "waiting",
        host: userId,
        participant: null,
      },
      {
        $set: {
          status: "completed",
          result: "cancelled",
          resultReason: "cancelled",
          completedAt: new Date(),
        },
      }
    );

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

    const problem = getRandomProblemByDifficulty(difficulty, previousWaitingSession?.problemTitle);

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
      session.resultReason = "timeout";
      session.completedAt = new Date();
      await session.save();

      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(400).json({ message: "Match time is over", session: populatedSession });
    }

    const loserId = isHost ? session.participant : session.host;
    const completedAt = new Date();
    const completedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        mode: "one-v-one",
        status: "active",
        winner: null,
      },
      {
        $set: {
          winner: userId,
          loser: loserId,
          result: "winner",
          resultReason: "solved",
          status: "completed",
          completedAt,
        },
      },
      { new: true }
    );

    if (!completedSession) {
      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(400).json({ message: "Match is already completed", session: populatedSession });
    }

    await User.updateMany(
      {
        _id: { $in: [userId, loserId] },
        $or: [{ rating: { $exists: false } }, { rating: null }],
      },
      {
        $set: { rating: 1000 },
      }
    );

    await User.bulkWrite([
      {
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { rating: 10 } },
        },
      },
      {
        updateOne: {
          filter: { _id: loserId },
          update: { $inc: { rating: -10 } },
        },
      },
    ]);

    const populatedSession = await populateOneVOneSession(completedSession._id);
    return res.status(200).json({ session: populatedSession });
  } catch (error) {
    console.error("Error in submitOneVOneWin controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveOneVOneSession(req, res) {
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

    if (session.status === "completed") {
      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(200).json({ session: populatedSession });
    }

    if (session.status === "waiting") {
      if (!isHost) {
        return res.status(403).json({ message: "Only the waiting player can cancel this match" });
      }

      session.status = "completed";
      session.result = "cancelled";
      session.resultReason = "cancelled";
      session.completedAt = new Date();
      await session.save();

      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(200).json({ session: populatedSession });
    }

    if (!session.participant) {
      return res.status(400).json({ message: "Match has not started yet" });
    }

    const winnerId = isHost ? session.participant : session.host;
    const loserId = userId;
    const completedAt = new Date();
    const completedSession = await Session.findOneAndUpdate(
      {
        _id: session._id,
        mode: "one-v-one",
        status: "active",
        winner: null,
      },
      {
        $set: {
          winner: winnerId,
          loser: loserId,
          result: "winner",
          resultReason: "forfeit",
          status: "completed",
          completedAt,
        },
      },
      { new: true }
    );

    if (!completedSession) {
      const populatedSession = await populateOneVOneSession(session._id);
      return res.status(400).json({ message: "Match is already completed", session: populatedSession });
    }

    await User.updateMany(
      {
        _id: { $in: [winnerId, loserId] },
        $or: [{ rating: { $exists: false } }, { rating: null }],
      },
      {
        $set: { rating: 1000 },
      }
    );

    await User.bulkWrite([
      {
        updateOne: {
          filter: { _id: winnerId },
          update: { $inc: { rating: 10 } },
        },
      },
      {
        updateOne: {
          filter: { _id: loserId },
          update: { $inc: { rating: -10 } },
        },
      },
    ]);

    const populatedSession = await populateOneVOneSession(completedSession._id);
    return res.status(200).json({ session: populatedSession });
  } catch (error) {
    console.error("Error in leaveOneVOneSession controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
