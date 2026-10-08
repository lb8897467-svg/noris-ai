import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { config } from "../config/env.js";
import { generateToken, generateOtp, generateSessionToken, authMiddleware, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// ─── Step 1: Register — send phone OTP ──────────────────────
const registerSchema = z.object({
  phone: z.string().min(8),
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(64),
  password: z.string().min(6).optional(),
});

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check for duplicates
    const existingPhone = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existingPhone?.phoneVerified) {
      return res.status(409).json({ error: "This phone number is already registered" });
    }
    const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingEmail?.emailVerified) {
      return res.status(409).json({ error: "This email is already registered" });
    }
    const existingUsername = await prisma.user.findUnique({ where: { username: body.username } });
    if (existingUsername) {
      return res.status(409).json({ error: "This username is already taken" });
    }

    // Create or update unverified user
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    const user = await prisma.user.upsert({
      where: { phone: body.phone },
      update: { email: body.email, username: body.username, passwordHash },
      create: {
        phone: body.phone,
        email: body.email,
        username: body.username,
        passwordHash,
        phoneVerified: false,
        emailVerified: false,
      },
    });

    // Create profile if not exists
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { displayName: body.displayName },
      create: { userId: user.id, displayName: body.displayName },
    });

    // Create default settings if not exists
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // Generate phone OTP
    const otp = generateOtp();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        phone: body.phone,
        code: otp,
        purpose: "phone_verify",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // In production: send SMS via provider. In dev: return code.
    // TODO: integrate SMS provider (Twilio, etc.)
    console.log(`[OTP] Phone verification for ${body.phone}: ${otp}`);

    res.json({
      message: "Verification code sent to your phone number",
      userId: user.id,
      ...(config.devOtpReturn ? { devOtp: otp } : {}),
    });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── Step 2: Verify phone OTP ───────────────────────────────
router.post("/verify-phone", async (req, res) => {
  try {
    const { userId, code } = req.body as { userId: string; code: string };

    const otp = await prisma.otpCode.findFirst({
      where: { userId, code, purpose: "phone_verify", consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    await prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } });

    // Generate email OTP
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const emailOtp = generateOtp();
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code: emailOtp,
        purpose: "email_verify",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // In production: send email via provider. In dev: return code.
    // TODO: integrate email provider (SendGrid, etc.)
    console.log(`[OTP] Email verification for ${user.email}: ${emailOtp}`);

    res.json({
      message: "Phone verified. Verification code sent to your email",
      ...(config.devOtpReturn ? { devOtp: emailOtp } : {}),
    });
  } catch (err) {
    console.error("Verify phone error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ─── Step 3: Verify email OTP & complete registration ──────
router.post("/verify-email", async (req, res) => {
  try {
    const { userId, code } = req.body as { userId: string; code: string };

    const otp = await prisma.otpCode.findFirst({
      where: { userId, code, purpose: "email_verify", consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });

    // Create session
    const token = generateToken(userId);
    const sessionToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        deviceType: "web",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, settings: true },
    });

    res.json({
      message: "Email verified. Account created successfully!",
      token,
      sessionToken,
      user: {
        id: user!.id,
        phone: user!.phone,
        email: user!.email,
        username: user!.username,
        role: user!.role,
        profile: user!.profile,
        settings: user!.settings,
      },
    });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Email verification failed" });
  }
});

// ─── Resend OTP ─────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { userId, type } = req.body as { userId: string; type: "phone" | "email" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = generateOtp();
    const purpose = type === "phone" ? "phone_verify" : "email_verify";
    const contact = type === "phone" ? user.phone : user.email;

    await prisma.otpCode.create({
      data: {
        userId: user.id,
        [type]: contact,
        code: otp,
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    console.log(`[OTP] ${type} verification for ${contact}: ${otp}`);

    res.json({
      message: `Verification code resent to your ${type}`,
      ...(config.devOtpReturn ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Failed to resend code" });
  }
});

// ─── Login with phone or email ──────────────────────────────
const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().optional(),
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    // Find by phone or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier.toLowerCase() }],
      },
      include: { profile: true, settings: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (!user.phoneVerified || !user.emailVerified) {
      return res.status(403).json({ error: "Account not fully verified", userId: user.id });
    }

    // If password is set, verify it
    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: "Password required" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // Create session
    const token = generateToken(user.id);
    const sessionToken = generateSessionToken();
    const deviceType = (req.headers["x-device-type"] as string) || "web";
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        deviceType,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Login successful",
      token,
      sessionToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
        settings: user.settings,
      },
    });
  } catch (err: any) {
    if (err.issues) return res.status(400).json({ error: err.issues[0].message });
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Get current user ───────────────────────────────────────
router.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { profile: true, settings: true },
    select: {
      id: true,
      phone: true,
      email: true,
      username: true,
      role: true,
      isOnline: true,
      lastSeen: true,
      profile: true,
      settings: true,
    },
  } as any);

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// ─── Logout ─────────────────────────────────────────────────
router.post("/logout", authMiddleware, async (req: AuthedRequest, res) => {
  const { sessionToken } = req.body;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { token: sessionToken, userId: req.userId } });
  }
  res.json({ message: "Logged out" });
});

// ─── Get active sessions ────────────────────────────────────
router.get("/sessions", authMiddleware, async (req: AuthedRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.userId, expiresAt: { gt: new Date() } },
    select: { id: true, deviceName: true, deviceType: true, platform: true, ipAddress: true, lastActive: true, createdAt: true, token: true },
    orderBy: { lastActive: "desc" },
  });
  res.json({ sessions });
});

// ─── Logout specific session ────────────────────────────────
router.delete("/sessions/:sessionId", authMiddleware, async (req: AuthedRequest, res) => {
  await prisma.session.deleteMany({ where: { id: req.params.sessionId, userId: req.userId } });
  res.json({ message: "Session terminated" });
});

export default router;
