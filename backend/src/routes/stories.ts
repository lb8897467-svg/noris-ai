import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get stories from contacts ──────────────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: req.userId },
    select: { targetId: true },
  });
  const contactIds = [...contacts.map((c) => c.targetId), req.userId!];

  const stories = await prisma.story.findMany({
    where: {
      userId: { in: contactIds },
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by user
  const byUser = new Map<string, any>();
  for (const s of stories) {
    if (!byUser.has(s.userId)) {
      byUser.set(s.userId, { user: s.user, stories: [] });
    }
    const hasViewed = s.viewedBy.includes(req.userId!);
    byUser.get(s.userId)!.stories.push({ ...s, hasViewed });
  }

  res.json({ stories: Array.from(byUser.values()) });
});

// ─── Create story ───────────────────────────────────────────
const createStorySchema = z.object({
  type: z.enum(["PHOTO", "VIDEO", "TEXT"]).default("PHOTO"),
  mediaUrl: z.string().optional(),
  text: z.string().optional(),
  backgroundColor: z.string().optional(),
  audience: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).default("CONTACTS"),
  expiresInHours: z.number().min(1).max(24).default(24),
});

router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = createStorySchema.parse(req.body);
    const story = await prisma.story.create({
      data: {
        userId: req.userId!,
        type: body.type,
        mediaUrl: body.mediaUrl,
        text: body.text,
        backgroundColor: body.backgroundColor,
        audience: body.audience,
        expiresAt: new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000),
      },
    });
    res.json({ story });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    res.status(500).json({ error: "Failed to create story" });
  }
});

// ─── View story ─────────────────────────────────────────────
router.post("/:storyId/view", authMiddleware, async (req: AuthedRequest, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.storyId } });
  if (!story) return res.status(404).json({ error: "Story not found" });

  if (!story.viewedBy.includes(req.userId!)) {
    await prisma.story.update({
      where: { id: story.id },
      data: { viewedBy: { push: req.userId! } },
    });
  }
  res.json({ message: "Story viewed" });
});

// ─── Delete story ───────────────────────────────────────────
router.delete("/:storyId", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.story.deleteMany({ where: { id: req.params.storyId, userId: req.userId } });
  res.json({ message: "Story deleted" });
});

export default router;
