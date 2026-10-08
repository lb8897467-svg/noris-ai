import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Search public channels ─────────────────────────────────
router.get("/search", authMiddleware, async (req: AuthedRequest, res) => {
  const q = (req.query.q as string)?.trim();
  const channels = await prisma.channel.findMany({
    where: q ? { isPublic: true, username: { contains: q, mode: "insensitive" } } : { isPublic: true },
    select: { id: true, username: true, title: true, description: true, photoUrl: true, subscriberCount: true },
    take: 20,
  });
  res.json({ channels });
});

// ─── Get channels I'm subscribed to ─────────────────────────
router.get("/mine", authMiddleware, async (req: AuthedRequest, res) => {
  const memberships = await prisma.channelMember.findMany({
    where: { userId: req.userId },
    include: { channel: true },
  });
  res.json({ channels: memberships.map((m) => m.channel) });
});

// ─── Create channel ──────────────────────────────────────────
const createChannelSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = createChannelSchema.parse(req.body);

    const existing = await prisma.channel.findUnique({ where: { username: body.username } });
    if (existing) return res.status(409).json({ error: "Channel username already taken" });

    // Create conversation for channel posts
    const conversation = await prisma.conversation.create({
      data: { type: "CHANNEL", title: body.title, createdBy: req.userId },
    });

    const channel = await prisma.channel.create({
      data: {
        username: body.username,
        title: body.title,
        description: body.description,
        isPublic: body.isPublic,
        ownerId: req.userId!,
        conversationId: conversation.id,
      },
    });

    await prisma.channelMember.create({
      data: { channelId: channel.id, userId: req.userId!, role: "OWNER" },
    });

    await prisma.conversationMember.create({
      data: { conversationId: conversation.id, userId: req.userId!, role: "OWNER" },
    });

    res.json({ channel });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    console.error("Create channel error:", err);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// ─── Get channel by username ────────────────────────────────
router.get("/:username", authMiddleware, async (req: AuthedRequest, res) => {
  const channel = await prisma.channel.findUnique({
    where: { username: req.params.username },
    include: { members: { select: { userId: true, role: true } } },
  });
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const isMember = channel.members.some((m) => m.userId === req.userId);
  res.json({ channel: { ...channel, isMember } });
});

// ─── Subscribe / join channel ───────────────────────────────
router.post("/:channelId/join", authMiddleware, async (req: AuthedRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: req.params.channelId } });
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId: channel.id, userId: req.userId! } },
    update: {},
    create: { channelId: channel.id, userId: req.userId!, role: "MEMBER" },
  });

  if (channel.conversationId) {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: channel.conversationId, userId: req.userId! } },
      update: {},
      create: { conversationId: channel.conversationId, userId: req.userId!, role: "MEMBER" },
    });
  }

  await prisma.channel.update({
    where: { id: channel.id },
    data: { subscriberCount: { increment: 1 } },
  });

  res.json({ message: "Joined channel" });
});

// ─── Leave channel ──────────────────────────────────────────
router.delete("/:channelId/leave", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.channelMember.deleteMany({ where: { channelId: req.params.channelId, userId: req.userId } });
  const channel = await prisma.channel.findUnique({ where: { id: req.params.channelId } });
  if (channel) {
    await prisma.channel.update({ where: { id: channel.id }, data: { subscriberCount: { decrement: 1 } } });
    if (channel.conversationId) {
      await prisma.conversationMember.deleteMany({ where: { conversationId: channel.conversationId, userId: req.userId } });
    }
  }
  res.json({ message: "Left channel" });
});

export default router;
