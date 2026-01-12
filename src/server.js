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


let isConnected = false;
app.use(async (req, res, next) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  next();
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

app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello, world!" });
})








// For Vercel serverless
export default app;