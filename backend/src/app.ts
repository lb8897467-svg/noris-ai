import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import contactRoutes from "./routes/contacts.js";
import conversationRoutes from "./routes/conversations.js";
import storyRoutes from "./routes/stories.js";
import channelRoutes from "./routes/channels.js";
import callRoutes from "./routes/calls.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";

const app = express();

// CORS — allow the frontend origin
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in dev/preview; restrict in production
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files for uploads
app.use("/uploads", express.static(config.uploadDir));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
