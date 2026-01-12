import express from "express";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { clerkMiddleware } from '@clerk/express'
import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import path from "path";
import { fileURLToPath } from 'url';

const app = express();
const PORT = ENV.PORT

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to DB on each request for serverless
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ message: "Database connection failed" });
    }
});

app.use(express.json());
app.use(cors(
    {
        origin: ENV.CLIENT_URL,
        credentials: true,
    }
))
app.use(clerkMiddleware());
app.use("/api/inngest", serve({ client: inngest, functions })) // deployment ke baad inngest me Apps me frontend ka URL daalna h
app.use("/api/chat", chatRoutes)
app.use("/api/sessions", sessionRoutes)

app.get("/hello", (req, res) => {
    res.json({ message: "Hello, world!" });
})




const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server", error);
        process.exit(1);
    }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
    startServer();
}

// For Vercel serverless
export default app;