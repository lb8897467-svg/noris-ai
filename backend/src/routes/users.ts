import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get own profile ────────────────────────────────────────
router.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { profile: true, settings: true },
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});

// ─── Update profile ─────────────────────────────────────────
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(200).optional(),
  status: z.string().max(100).optional(),
  photoUrl: z.string().optional(),
});

router.patch("/me/profile", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const profile = await prisma.profile.upsert({
      where: { userId: req.userId! },
      update: body,
      create: { userId: req.userId!, displayName: body.displayName || "User", ...body },
    });
    res.json({ profile });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    res.status(500).json({ error: "Update failed" });
  }
});

// ─── Update username ────────────────────────────────────────
router.patch("/me/username", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { username } = req.body as { username: string };
    if (!username || username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.userId) {
      return res.status(409).json({ error: "Username already taken" });
    }

    await prisma.user.update({ where: { id: req.userId }, data: { username } });
    res.json({ message: "Username updated", username });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ─── Search users by username ───────────────────────────────
router.get("/search", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.userId } },
          { phoneVerified: true, emailVerified: true },
          {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { profile: { displayName: { contains: q, mode: "insensitive" } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        isOnline: true,
        lastSeen: true,
        profile: { select: { displayName: true, photoUrl: true, bio: true } },
      },
      take: 20,
    });

    res.json({ users });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ─── Get user by id (respects privacy) ──────────────────────
router.get("/:userId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { profile: true, settings: true },
    });
    if (!target) return res.status(404).json({ error: "User not found" });

    // Check block
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: target.id, blockedId: req.userId },
          { blockerId: req.userId, blockedId: target.id },
        ],
      },
    });

    // Check if contact
    const isContact = await prisma.contact.findFirst({
      where: { ownerId: req.userId, targetId: target.id },
    });

    const settings = target.settings;
    const isSelf = target.id === req.userId;

    // Apply privacy
    const profile: any = {
      id: target.id,
      username: target.username,
      isOnline: target.isOnline,
      lastSeen: target.lastSeen,
      profile: {
        displayName: target.profile?.displayName,
        photoUrl: target.profile?.photoUrl,
        bio: target.profile?.bio,
        status: target.profile?.status,
      },
    };

    if (!isSelf) {
      // Phone visibility
      if (settings?.phoneVisibility !== "EVERYONE" && !(settings?.phoneVisibility === "CONTACTS" && isContact)) {
        delete (profile as any).phone;
      }
      // Last seen visibility
      if (settings?.lastSeenVisibility === "NOBODY" || (settings?.lastSeenVisibility === "CONTACTS" && !isContact)) {
        delete profile.lastSeen;
        profile.isOnline = false;
      }
      // Profile photo visibility
      if (settings?.profilePhotoVisibility === "NOBODY" || (settings?.profilePhotoVisibility === "CONTACTS" && !isContact)) {
        profile.profile.photoUrl = null;
      }
    } else {
      profile.phone = target.phone;
      profile.email = target.email;
    }

    if (blocked) {
      profile.isBlocked = true;
    }

    res.json({ user: profile, isContact: !!isContact });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
