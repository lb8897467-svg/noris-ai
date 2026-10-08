import http from "http";
import app from "./app.js";
import { config } from "./config/env.js";
import { setupSocket } from "./services/socket.js";
import prisma from "./lib/prisma.js";

const server = http.createServer(app);

// Setup WebSocket server
const io = setupSocket(server);

// Set io instance on app for use in routes if needed
app.set("io", io);

async function start() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log("✅ Connected to database");

    // Push schema to database (dev mode)
    if (process.env.NODE_ENV !== "production") {
      const { execSync } = await import("child_process");
      try {
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit", env: process.env });
        console.log("✅ Database schema pushed");
      } catch (e) {
        console.warn("⚠️  Could not push schema:", e);
      }
    }

    server.listen(config.port, "0.0.0.0", () => {
      console.log(`🚀 Noris backend running on port ${config.port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();

export { io };
