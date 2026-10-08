import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import prisma from "../lib/prisma.js";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
  sessionId?: string;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiry });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    return payload;
  } catch {
    return null;
  }
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateSessionToken(): string {
  return nanoid(48);
}

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: "Session expired" });
  }

  // Update last active
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActive: new Date(), ipAddress: req.ip },
  });

  req.userId = payload.userId;
  req.sessionId = session.id;
  next();
}

export async function adminMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
