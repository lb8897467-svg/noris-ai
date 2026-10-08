import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get notifications ──────────────────────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications });
});

// ─── Mark as read ───────────────────────────────────────────
router.post("/read", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: "All notifications marked as read" });
});

// ─── Mark single as read ────────────────────────────────────
router.post("/:id/read", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: { isRead: true },
  });
  res.json({ message: "Notification marked as read" });
});

export default router;
