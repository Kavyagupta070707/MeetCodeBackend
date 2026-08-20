import express from "express";
import cors from "cors";
import http from "http";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { clerkMiddleware } from "@clerk/express";
import sessionRoutes from "./routes/sessionRoutes.js";
import oneVOneRoutes from "./routes/oneVOneRoutes.js";
import codeRoutes from "./routes/codeRoutes.js";
import { initializeSocket } from "./lib/socket.js";

const app = express();

connectDB().catch(err => {
  console.error("Failed to connect to database:", err);
});

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use(express.json());

app.use(clerkMiddleware());

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/code", codeRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/one-v-one", oneVOneRoutes);

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello, world!" });
});

const server = http.createServer(app);
initializeSocket(server, ENV.CLIENT_URL);

if (process.env.VERCEL !== "1") {
  const port = ENV.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default server;
