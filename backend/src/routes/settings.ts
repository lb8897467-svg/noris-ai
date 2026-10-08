import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get settings ───────────────────────────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  let settings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
  if (!settings) {
    settings = await prisma.userSettings.create({ data: { userId: req.userId! } });
  }
  res.json({ settings });
});

// ─── Update settings ────────────────────────────────────────
router.patch("/", authMiddleware, async (req: AuthedRequest, res) => {
  const allowed = [
    "phoneVisibility", "emailVisibility", "lastSeenVisibility", "profilePhotoVisibility",
    "whoCanCall", "whoCanAddToGroups", "whoCanFindByPhone",
    "notifMessages", "notifCalls", "notifPreviews", "quietHoursStart", "quietHoursEnd", "notifSound",
    "theme", "accentColor", "language", "messageRetentionDays",
  ];

  const data: any = {};
  for (const key of allowed) {
    if (key in req.body) data[key] = req.body[key];
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId },
    update: data,
    create: { userId: req.userId!, ...data },
  });

  res.json({ settings });
});

// ─── Enable two-step verification ────────────────────────────
router.post("/two-step/enable", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const hash = await bcrypt.hash(password, 10);
    await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: { twoStepEnabled: true, twoStepPasswordHash: hash },
      create: { userId: req.userId!, twoStepEnabled: true, twoStepPasswordHash: hash },
    });
    res.json({ message: "Two-step verification enabled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to enable two-step verification" });
  }
});

// ─── Disable two-step verification ──────────────────────────
router.post("/two-step/disable", authMiddleware, async (req: AuthedRequest, res) => {
  const { password } = req.body as { password: string };
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
  if (!settings?.twoStepPasswordHash) return res.json({ message: "Already disabled" });

  const valid = await bcrypt.compare(password, settings.twoStepPasswordHash);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  await prisma.userSettings.update({
    where: { userId: req.userId },
    data: { twoStepEnabled: false, twoStepPasswordHash: null },
  });
  res.json({ message: "Two-step verification disabled" });
});

// ─── Delete account ─────────────────────────────────────────
router.delete("/account", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { password } = req.body as { password?: string };
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (user?.passwordHash) {
      if (!password) return res.status(400).json({ error: "Password required" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid password" });
    }

    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ─── Export data ────────────────────────────────────────────
router.get("/export", authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [profile, contacts, conversations, messages, settings] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.contact.findMany({ where: { ownerId: userId }, include: { target: { select: { username: true, profile: { select: { displayName: true } } } } } }),
    prisma.conversationMember.findMany({ where: { userId }, include: { conversation: true } }),
    prisma.message.findMany({ where: { senderId: userId }, take: 1000 }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  res.json({ profile, contacts, conversations: conversations.map((c) => c.conversation), messages, settings });
});

export default router;
