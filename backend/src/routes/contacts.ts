import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get contacts list ──────────────────────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: req.userId },
    include: {
      target: {
        select: {
          id: true,
          username: true,
          isOnline: true,
          lastSeen: true,
          profile: { select: { displayName: true, photoUrl: true, bio: true, status: true } },
        },
      },
    },
    orderBy: { target: { profile: { displayName: "asc" } } },
  });
  res.json({ contacts });
});

// ─── Add contact by user ID ─────────────────────────────────
router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { targetId, nickname } = req.body as { targetId: string; nickname?: string };
    if (targetId === req.userId) return res.status(400).json({ error: "Cannot add yourself" });

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const contact = await prisma.contact.upsert({
      where: { ownerId_targetId: { ownerId: req.userId!, targetId } },
      update: { nickname },
      create: { ownerId: req.userId!, targetId, nickname },
    });

    res.json({ contact });
  } catch (err) {
    console.error("Add contact error:", err);
    res.status(500).json({ error: "Failed to add contact" });
  }
});

// ─── Remove contact ─────────────────────────────────────────
router.delete("/:targetId", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.contact.deleteMany({ where: { ownerId: req.userId, targetId: req.params.targetId } });
  res.json({ message: "Contact removed" });
});

// ─── Toggle favorite ────────────────────────────────────────
router.patch("/:targetId/favorite", authMiddleware, async (req: AuthedRequest, res) => {
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: req.userId!, targetId: req.params.targetId } },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const updated = await prisma.contact.update({
    where: { id: contact.id },
    data: { isFavorite: !contact.isFavorite },
  });
  res.json({ contact: updated });
});

// ─── Friend requests ────────────────────────────────────────

// Send friend request
router.post("/requests", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { receiverId, message } = req.body as { receiverId: string; message?: string };
    if (receiverId === req.userId) return res.status(400).json({ error: "Cannot send request to yourself" });

    // Check block
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: receiverId, blockedId: req.userId },
          { blockerId: req.userId, blockedId: receiverId },
        ],
      },
    });
    if (blocked) return res.status(403).json({ error: "Cannot send request" });

    // Check if already contacts
    const existing = await prisma.contact.findFirst({ where: { ownerId: req.userId, targetId: receiverId } });
    if (existing) return res.status(409).json({ error: "Already in contacts" });

    // Check existing request
    const existingReq = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: req.userId!, receiverId } },
    });
    if (existingReq && existingReq.status === "pending") {
      return res.status(409).json({ error: "Friend request already sent" });
    }

    // Check if there's a reverse pending request — auto accept
    const reverseReq = await prisma.friendRequest.findFirst({
      where: { senderId: receiverId, receiverId: req.userId, status: "pending" },
    });
    if (reverseReq) {
      await prisma.friendRequest.update({ where: { id: reverseReq.id }, data: { status: "accepted" } });
      await prisma.contact.createMany({
        data: [
          { ownerId: req.userId!, targetId: receiverId },
          { ownerId: receiverId, targetId: req.userId! },
        ],
        skipDuplicates: true,
      });
      return res.json({ message: "Friend request accepted", status: "accepted" });
    }

    const request = await prisma.friendRequest.create({
      data: { senderId: req.userId!, receiverId, message, status: "pending" },
    });

    res.json({ request });
  } catch (err) {
    console.error("Send request error:", err);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// Get received requests
router.get("/requests/received", authMiddleware, async (req: AuthedRequest, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: req.userId, status: "pending" },
    include: {
      sender: {
        select: {
          id: true, username: true,
          profile: { select: { displayName: true, photoUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
});

// Get sent requests
router.get("/requests/sent", authMiddleware, async (req: AuthedRequest, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: { senderId: req.userId, status: "pending" },
    include: {
      receiver: {
        select: {
          id: true, username: true,
          profile: { select: { displayName: true, photoUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ requests });
});

// Accept / reject / cancel
router.patch("/requests/:requestId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { status } = req.body as { status: "accepted" | "rejected" | "cancelled" };
    const request = await prisma.friendRequest.findUnique({ where: { id: req.params.requestId } });
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Validate ownership
    if (status === "cancelled" && request.senderId !== req.userId) {
      return res.status(403).json({ error: "Not your request" });
    }
    if ((status === "accepted" || status === "rejected") && request.receiverId !== req.userId) {
      return res.status(403).json({ error: "Not your request" });
    }

    await prisma.friendRequest.update({ where: { id: request.id }, data: { status } });

    if (status === "accepted") {
      await prisma.contact.createMany({
        data: [
          { ownerId: request.senderId, targetId: request.receiverId },
          { ownerId: request.receiverId, targetId: request.senderId },
        ],
        skipDuplicates: true,
      });
    }

    res.json({ message: `Request ${status}` });
  } catch (err) {
    console.error("Update request error:", err);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// ─── Block / unblock ────────────────────────────────────────
router.post("/block/:targetId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: req.params.targetId } },
      update: {},
      create: { blockerId: req.userId!, blockedId: req.params.targetId },
    });
    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.delete("/block/:targetId", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: req.params.targetId } });
  res.json({ message: "User unblocked" });
});

router.get("/blocked", authMiddleware, async (req: AuthedRequest, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId },
    include: {
      blocked: {
        select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } },
      },
    },
  });
  res.json({ blocked: blocks.map((b) => b.blocked) });
});

export default router;
