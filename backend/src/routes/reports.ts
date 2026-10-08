import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Create report ──────────────────────────────────────────
router.post("/", authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { reportedUserId, reason, description, targetType, targetId } = req.body as {
      reportedUserId?: string;
      reason: string;
      description?: string;
      targetType?: string;
      targetId?: string;
    };

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId!,
        reportedUserId,
        reason,
        description,
        targetType,
        targetId,
        status: "pending",
      },
    });

    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to create report" });
  }
});

export default router;
