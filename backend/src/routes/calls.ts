import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get call history ───────────────────────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  const calls = await prisma.call.findMany({
    where: {
      OR: [{ initiatorId: req.userId }, { receiverId: req.userId }],
    },
    include: {
      initiator: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } },
      receiver: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ calls });
});

// ─── Create call record ─────────────────────────────────────
router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { receiverId, type, conversationId } = req.body as { receiverId: string; type: "VOICE" | "VIDEO"; conversationId?: string };
    const call = await prisma.call.create({
      data: {
        initiatorId: req.userId!,
        receiverId,
        conversationId,
        type,
        status: "OUTGOING",
      },
    });
    res.json({ call });
  } catch (err) {
    res.status(500).json({ error: "Failed to create call" });
  }
});

// ─── Update call status ─────────────────────────────────────
router.patch("/:callId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { status, startedAt, endedAt, duration } = req.body as { status: string; startedAt?: string; endedAt?: string; duration?: number };
    const call = await prisma.call.update({
      where: { id: req.params.callId },
      data: { status, ...(startedAt && { startedAt: new Date(startedAt) }), ...(endedAt && { endedAt: new Date(endedAt) }), ...(duration !== undefined && { duration }) },
    });
    res.json({ call });
  } catch (err) {
    res.status(500).json({ error: "Failed to update call" });
  }
});

export default router;
