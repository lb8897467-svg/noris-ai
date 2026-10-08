import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Get all conversations for the user ──────────────────────
router.get("/", authMiddleware, async (req: AuthedRequest, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: req.userId, archived: false },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true, username: true, isOnline: true, lastSeen: true,
                  profile: { select: { displayName: true, photoUrl: true } },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  // Count unread for each conversation
  const conversations = await Promise.all(
    memberships.map(async (m) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: req.userId },
          createdAt: { gt: m.lastReadAt || new Date(0) },
          deletedForEveryone: false,
          NOT: { deletedFor: { has: req.userId } },
        },
      });

      // For direct chats, get the other user
      let otherUser = null;
      if (m.conversation.type === "DIRECT") {
        otherUser = m.conversation.members.find((mem) => mem.userId !== req.userId)?.user || null;
      }

      return {
        ...m.conversation,
        unreadCount,
        draftText: m.draftText,
        muted: m.muted,
        archived: m.archived,
        lastReadAt: m.lastReadAt,
        otherUser,
        role: m.role,
      };
    })
  );

  res.json({ conversations });
});

// ─── Get archived conversations ─────────────────────────────
router.get("/archived", authMiddleware, async (req: AuthedRequest, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: req.userId, archived: true },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  res.json({ conversations: memberships.map((m) => m.conversation) });
});

// ─── Create or get direct conversation ──────────────────────
router.post("/direct", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { targetUserId } = req.body as { targetUserId: string };
    if (targetUserId === req.userId) return res.status(400).json({ error: "Cannot chat with yourself" });

    // Check if conversation already exists
    const existingMemberships = await prisma.conversationMember.findMany({
      where: { userId: req.userId },
      select: { conversationId: true },
    });

    const existing = await prisma.conversationMember.findFirst({
      where: {
        userId: targetUserId,
        conversationId: { in: existingMemberships.map((m) => m.conversationId) },
      },
      include: { conversation: true },
    });

    if (existing && existing.conversation.type === "DIRECT") {
      return res.json({ conversation: existing.conversation });
    }

    // Create new direct conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdBy: req.userId,
        members: {
          create: [
            { userId: req.userId!, role: "MEMBER" },
            { userId: targetUserId, role: "MEMBER" },
          ],
        },
      },
      include: { members: true },
    });

    res.json({ conversation });
  } catch (err) {
    console.error("Create direct conversation error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// ─── Create group ────────────────────────────────────────────
const createGroupSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).min(1),
});

router.post("/group", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = createGroupSchema.parse(req.body);

    const conversation = await prisma.conversation.create({
      data: {
        type: "GROUP",
        title: body.title,
        description: body.description,
        createdBy: req.userId,
        members: {
          create: [
            { userId: req.userId!, role: "OWNER" },
            ...body.memberIds.filter((id) => id !== req.userId).map((id) => ({ userId: id, role: "MEMBER" as const })),
          ],
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } } } } },
    });

    res.json({ conversation });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    console.error("Create group error:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// ─── Get conversation details ───────────────────────────────
router.get("/:conversationId", authMiddleware, async (req: AuthedRequest, res) => {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
  });
  if (!membership) return res.status(403).json({ error: "Not a member" });

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, isOnline: true, lastSeen: true, profile: { select: { displayName: true, photoUrl: true, bio: true } } },
          },
        },
      },
    },
  });

  res.json({ conversation });
});

// ─── Get messages (paginated) ───────────────────────────────
router.get("/:conversationId/messages", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member" });

    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = await prisma.message.findMany({
      where: {
        conversationId: req.params.conversationId,
        deletedForEveryone: false,
        NOT: { deletedFor: { has: req.userId } },
      },
      include: {
        sender: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } },
        attachments: true,
        reactions: { include: { user: { select: { id: true, username: true } } } },
        replyTo: { include: { sender: { select: { id: true, username: true, profile: { select: { displayName: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    res.json({
      messages: items.reverse(),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// ─── Send message ───────────────────────────────────────────
const sendMessageSchema = z.object({
  text: z.string().optional(),
  type: z.enum(["TEXT", "PHOTO", "VIDEO", "VOICE", "DOCUMENT", "CONTACT_CARD", "LOCATION", "SYSTEM"]).optional(),
  replyToId: z.string().optional(),
  attachments: z.array(z.object({
    fileUrl: z.string(),
    fileType: z.string(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
  })).optional(),
});

router.post("/:conversationId/messages", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const body = sendMessageSchema.parse(req.body);
    const conversationId = req.params.conversationId;

    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId! } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member" });

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId!,
        text: body.text,
        type: body.type || "TEXT",
        replyToId: body.replyToId,
        attachments: body.attachments?.length
          ? { create: body.attachments }
          : undefined,
      },
      include: {
        sender: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } },
        attachments: true,
        reactions: true,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    res.json({ message });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── Edit message ───────────────────────────────────────────
router.patch("/:conversationId/messages/:messageId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { text } = req.body as { text: string };
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.senderId !== req.userId) return res.status(403).json({ error: "Can only edit your own messages" });

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { text, editedAt: new Date() },
    });
    res.json({ message: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to edit message" });
  }
});

// ─── Delete message ─────────────────────────────────────────
router.delete("/:conversationId/messages/:messageId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { forEveryone } = req.query as { forEveryone?: string };
    const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (forEveryone === "true") {
      if (message.senderId !== req.userId) return res.status(403).json({ error: "Can only delete your own messages" });
      await prisma.message.update({ where: { id: message.id }, data: { deletedForEveryone: true, text: null } });
    } else {
      // Delete for self
      await prisma.message.update({
        where: { id: message.id },
        data: { deletedFor: { push: req.userId! } },
      });
    }

    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// ─── React to message ───────────────────────────────────────
router.post("/:conversationId/messages/:messageId/react", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { emoji } = req.body as { emoji: string };
    const messageId = req.params.messageId;

    const existing = await prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: req.userId!, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      res.json({ message: "Reaction removed" });
    } else {
      const reaction = await prisma.reaction.create({
        data: { messageId, userId: req.userId!, emoji },
      });
      res.json({ reaction });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to react" });
  }
});

// ─── Pin / unpin message ─────────────────────────────────────
router.patch("/:conversationId/messages/:messageId/pin", authMiddleware, async (req: AuthedRequest, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ error: "Message not found" });

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { pinned: !message.pinned },
  });
  res.json({ message: updated });
});

// ─── Mark messages as read ──────────────────────────────────
router.post("/:conversationId/read", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    data: { lastReadAt: new Date() },
  });
  res.json({ message: "Marked as read" });
});

// ─── Search within conversation ─────────────────────────────
router.get("/:conversationId/search", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) return res.json({ messages: [] });

    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member" });

    const messages = await prisma.message.findMany({
      where: {
        conversationId: req.params.conversationId,
        text: { contains: q, mode: "insensitive" },
        deletedForEveryone: false,
        NOT: { deletedFor: { has: req.userId } },
      },
      include: { sender: { select: { id: true, username: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// ─── Mute / unmute conversation ─────────────────────────────
router.patch("/:conversationId/mute", authMiddleware, async (req: AuthedRequest, res) => {
  const { muted } = req.body as { muted: boolean };
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    data: { muted },
  });
  res.json({ message: `Conversation ${muted ? "muted" : "unmuted"}` });
});

// ─── Archive / unarchive ────────────────────────────────────
router.patch("/:conversationId/archive", authMiddleware, async (req: AuthedRequest, res) => {
  const { archived } = req.body as { archived: boolean };
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    data: { archived },
  });
  res.json({ message: `Conversation ${archived ? "archived" : "unarchived"}` });
});

// ─── Save draft ─────────────────────────────────────────────
router.patch("/:conversationId/draft", authMiddleware, async (req: AuthedRequest, res) => {
  const { draftText } = req.body as { draftText: string };
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    data: { draftText: draftText || null },
  });
  res.json({ message: "Draft saved" });
});

// ─── Group management ───────────────────────────────────────
router.patch("/:conversationId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { title, description, photoUrl } = req.body as { title?: string; description?: string; photoUrl?: string };
    const updated = await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: { ...(title && { title }), ...(description !== undefined && { description }), ...(photoUrl !== undefined && { photoUrl }) },
    });
    res.json({ conversation: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

// ─── Add members to group ───────────────────────────────────
router.post("/:conversationId/members", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { userIds } = req.body as { userIds: string[] };
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    await prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({ conversationId: req.params.conversationId, userId, role: "MEMBER" as const })),
      skipDuplicates: true,
    });
    res.json({ message: "Members added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add members" });
  }
});

// ─── Remove member ──────────────────────────────────────────
router.delete("/:conversationId/members/:userId", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    await prisma.conversationMember.deleteMany({
      where: { conversationId: req.params.conversationId, userId: req.params.userId },
    });
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// ─── Update member role ─────────────────────────────────────
router.patch("/:conversationId/members/:userId/role", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { role } = req.body as { role: "OWNER" | "ADMIN" | "MEMBER" };
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.conversationId, userId: req.userId! } },
    });
    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ error: "Owner access required" });
    }

    await prisma.conversationMember.updateMany({
      where: { conversationId: req.params.conversationId, userId: req.params.userId },
      data: { role },
    });
    res.json({ message: "Role updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ─── Leave conversation ─────────────────────────────────────
router.delete("/:conversationId/leave", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.conversationMember.deleteMany({
    where: { conversationId: req.params.conversationId, userId: req.userId },
  });
  res.json({ message: "Left conversation" });
});

export default router;
