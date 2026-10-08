import { Server as SocketServer } from "socket.io";
import type { Server } from "http";
import { verifyToken } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

// Map of userId -> Set<socketId> for active connections
const userSockets = new Map<string, Set<string>>();

export function setupSocket(httpServer: Server) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 30000,
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error("Authentication required"));
    const payload = verifyToken(token);
    if (!payload) return next(new Error("Invalid token"));
    socket.data.userId = payload.userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Mark user online
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });
    io.emit("user:status", { userId, isOnline: true, lastSeen: new Date().toISOString() });

    // Join user's conversations
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    for (const m of memberships) {
      socket.join(`conv:${m.conversationId}`);
    }

    console.log(`User ${userId} connected (${socket.id})`);

    // ─── Join conversation room ───
    socket.on("conversation:join", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    // ─── Typing indicator ───
    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    // ─── New message (broadcast to conversation) ───
    socket.on("message:send", (data: { conversationId: string; message: any }) => {
      socket.to(`conv:${data.conversationId}`).emit("message:new", data);
    });

    // ─── Message read ───
    socket.on("message:read", ({ conversationId, messageIds }: { conversationId: string; messageIds: string[] }) => {
      socket.to(`conv:${conversationId}`).emit("message:read", { conversationId, userId, messageIds });
    });

    // ─── Message reaction ───
    socket.on("message:react", (data: { conversationId: string; messageId: string; emoji: string }) => {
      socket.to(`conv:${data.conversationId}`).emit("message:react", { ...data, userId });
    });

    // ─── Message edit / delete ───
    socket.on("message:edit", (data: { conversationId: string; messageId: string; text: string }) => {
      socket.to(`conv:${data.conversationId}`).emit("message:edit", data);
    });

    socket.on("message:delete", (data: { conversationId: string; messageId: string; forEveryone: boolean }) => {
      socket.to(`conv:${data.conversationId}`).emit("message:delete", data);
    });

    // ─── Call signaling ───
    socket.on("call:offer", (data: { to: string; signal: any; callType: string; callId: string }) => {
      const targetSockets = userSockets.get(data.to);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("call:offer", { from: userId, signal: data.signal, callType: data.callType, callId: data.callId });
        }
      }
    });

    socket.on("call:answer", (data: { to: string; signal: any; callId: string }) => {
      const targetSockets = userSockets.get(data.to);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("call:answer", { from: userId, signal: data.signal, callId: data.callId });
        }
      }
    });

    socket.on("call:ice", (data: { to: string; candidate: any }) => {
      const targetSockets = userSockets.get(data.to);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("call:ice", { from: userId, candidate: data.candidate });
        }
      }
    });

    socket.on("call:end", (data: { to: string; callId: string }) => {
      const targetSockets = userSockets.get(data.to);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("call:end", { from: userId, callId: data.callId });
        }
      }
    });

    socket.on("call:decline", (data: { to: string; callId: string }) => {
      const targetSockets = userSockets.get(data.to);
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit("call:decline", { from: userId, callId: data.callId });
        }
      }
    });

    // ─── Disconnect ───
    socket.on("disconnect", async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          });
          io.emit("user:status", { userId, isOnline: false, lastSeen: new Date().toISOString() });
        }
      }
      console.log(`User ${userId} disconnected (${socket.id})`);
    });
  });

  return io;
}

export function getUserSockets(userId: string): Set<string> | undefined {
  return userSockets.get(userId);
}
