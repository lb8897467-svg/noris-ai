import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { authMiddleware, adminMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// All routes require admin
router.use(authMiddleware, adminMiddleware);

// ─── Dashboard stats ────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const [users, messages, conversations, reports, channels] = await Promise.all([
    prisma.user.count(),
    prisma.message.count(),
    prisma.conversation.count(),
    prisma.report.count({ where: { status: "pending" } }),
    prisma.channel.count(),
  ]);

  const activeUsers = await prisma.user.count({ where: { isOnline: true } });
  const newUsersToday = await prisma.user.count({
    where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  res.json({ stats: { users, activeUsers, newUsersToday, messages, conversations, reports, channels } });
});

// ─── User management ────────────────────────────────────────
router.get("/users", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const search = req.query.search as string;

  const where = search ? {
    OR: [
      { username: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" as const } },
    ],
  } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { profile: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

// ─── Get reports ─────────────────────────────────────────────
router.get("/reports", async (req, res) => {
  const status = req.query.status as string;
  const reports = await prisma.report.findMany({
    where: status ? { status } : undefined,
    include: {
      reporter: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
      reportedUser: { select: { id: true, username: true, profile: { select: { displayName: true, photoUrl: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ reports });
});

// ─── Update report status ───────────────────────────────────
router.patch("/reports/:id", async (req, res) => {
  const { status } = req.body as { status: string };
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      adminId: (req as AuthedRequest).userId!,
      action: "update_report",
      targetType: "report",
      targetId: report.id,
      metadata: { status },
    },
  });

  res.json({ report });
});

// ─── Audit logs ──────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { admin: { select: { id: true, username: true, profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ logs });
});

export default router;
