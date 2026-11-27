import { Router, type Response } from "express";
import { z } from "zod";
import { CITIES } from "../src/shared/cities";
import type { UserRole } from "../src/shared/types";
import {
  audit,
  createSession,
  DEMO_ACCOUNT_META,
  destroySession,
  findUserByEmail,
  findUserById,
  getDb,
  saveDb,
  toSessionUser,
  type UserRecord,
} from "./db";
import {
  SESSION_COOKIE,
  isDemoMode,
  requireAuth,
  type AuthedRequest,
} from "./auth";
import {
  hashPassword,
  passwordIssues,
  randomToken,
  sha256,
  uid,
  verifyPassword,
} from "./password";
import { rateLimit } from "./rateLimit";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function baseUrl(req: AuthedRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  return `${proto}://${req.get("host")}`;
}

function isHttpsRequest(req: AuthedRequest): boolean {
  const proto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  return Boolean(req.secure || proto === "https");
}

function shouldUseSecureCookie(req: AuthedRequest): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production" && isHttpsRequest(req);
}

function setSessionCookie(
  req: AuthedRequest,
  res: Response,
  token: string,
  remember: boolean,
): void {
  const maxAge = (remember ? 30 : 7) * 86_400_000;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    maxAge,
    path: "/",
  });
}

function clearedCookie(req: AuthedRequest, res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
  });
}

function publicUser(user: UserRecord) {
  return {
    ...toSessionUser(user),
    officialVerified: user.officialVerified,
    isDemo: user.email.endsWith("@demo.samajdarpan.in"),
  };
}

function validationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    error: "Please check the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
  });
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(EMAIL_RE, "Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .regex(PHONE_RE, "Enter a 10-digit Indian mobile number."),
    password: z.string().min(10, "Use at least 10 characters."),
    confirmPassword: z.string(),
    state: z.string().trim().min(2, "Select your state."),
    city: z.string().trim().min(1, "Select your city."),
    role: z.enum(["citizen", "official"]).default("citizen"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

authRouter.get("/demo-accounts", (req, res) => {
  res.json({
    enabled: isDemoMode(),
    accounts: isDemoMode() ? DEMO_ACCOUNT_META : [],
  });
});

authRouter.get("/providers", (req, res) => {
  res.json({
    demoMode: isDemoMode(),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL),
    emailDeliveryConfigured: false,
  });
});

authRouter.post(
  "/register",
  rateLimit({ windowMs: 15 * 60_000, max: 12, keyPrefix: "register" }),
  (req: AuthedRequest, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const input = parsed.data;

    if (findUserByEmail(input.email)) {
      res.status(409).json({
        error: "An account with this email already exists.",
        fieldErrors: { email: ["An account with this email already exists."] },
      });
      return;
    }
    const issues = passwordIssues(input.password);
    if (issues.length) {
      res.status(400).json({
        error: issues[0],
        fieldErrors: { password: issues },
      });
      return;
    }
    const city = CITIES.find(
      (c) =>
        c.id === input.city ||
        c.slug === input.city ||
        c.name.toLowerCase() === input.city.toLowerCase(),
    );
    if (!city) {
      res.status(400).json({
        error: "Select a supported city.",
        fieldErrors: { city: ["Select a supported city from the list."] },
      });
      return;
    }

    const rawToken = randomToken(24);
    const user: UserRecord = {
      id: uid("usr"),
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: hashPassword(input.password),
      role: input.role as UserRole,
      state: city.state,
      city: city.slug,
      avatarUrl: null,
      emailVerified: false,
      verificationTokenHash: sha256(rawToken),
      verificationExpiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      authProvider: "local",
      officialVerified: false,
      followedProjectIds: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    getDb().users.push(user);
    saveDb();

    audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "auth.register",
      entityType: "auth",
      entityId: user.id,
      summary: `Registered a ${user.role} account (${user.email}).`,
      before: null,
      after: { role: user.role, city: user.city },
    });

    const demo = isDemoMode();
    res.status(201).json({
      user: publicUser(user),
      requiresEmailVerification: true,
      demoMode: demo,
      // Demo builds have no mail transport. The link is returned so the flow
      // can be completed and tested; production deployments must send email.
      verificationUrl: demo
        ? `${baseUrl(req)}/verify-email?token=${rawToken}`
        : null,
      message: demo
        ? "Account created. Demo mode: use the verification link shown to verify your email."
        : "Account created. Email delivery is not configured on this server; an administrator must verify your account.",
    });
  },
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional().default(false),
});

authRouter.post(
  "/login",
  rateLimit({ windowMs: 10 * 60_000, max: 20, keyPrefix: "login" }),
  (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const { email, password, remember } = parsed.data;
    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    if (!user.emailVerified && user.authProvider === "local") {
      res.status(403).json({
        error:
          "Verify your email address before signing in. Use the verification link sent at registration, or ask an administrator to verify the account.",
        code: "email_unverified",
      });
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    saveDb();
    const token = createSession(user.id, remember ? 30 : 7);
    setSessionCookie(req, res, token, remember);
    audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "auth.login",
      entityType: "auth",
      entityId: user.id,
      summary: `Signed in as ${user.email}.`,
      before: null,
      after: { role: user.role },
    });
    res.json({ user: publicUser(user), demo: isDemoMode() });
  },
);

authRouter.post(
  "/demo-login",
  rateLimit({ windowMs: 10 * 60_000, max: 30, keyPrefix: "demo-login" }),
  (req, res) => {
    if (!isDemoMode()) {
      res.status(403).json({ error: "Demo sign-in is disabled on this deployment." });
      return;
    }
    const role = req.body?.role;
    const account = DEMO_ACCOUNT_META.find((a) => a.role === role);
    if (!account) {
      res.status(400).json({ error: "Unknown demo role." });
      return;
    }
    const user = findUserById(account.id);
    if (!user) {
      res.status(500).json({ error: "Demo account is not seeded." });
      return;
    }
    user.lastLoginAt = new Date().toISOString();
    saveDb();
    const token = createSession(user.id, 7);
    setSessionCookie(req, res, token, false);
    audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "auth.demo_login",
      entityType: "auth",
      entityId: user.id,
      summary: `Opened demo ${user.role} account (${user.email}).`,
      before: null,
      after: { role: user.role },
    });
    res.json({ user: publicUser(user), demo: true });
  },
);

authRouter.post("/logout", (req: AuthedRequest, res) => {
  const token = (req as AuthedRequest & { cookies?: Record<string, string> })
    .cookies?.[SESSION_COOKIE];
  destroySession(token);
  clearedCookie(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", (req: AuthedRequest, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: publicUser(req.user) });
});

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address."),
});

authRouter.post(
  "/forgot-password",
  rateLimit({ windowMs: 15 * 60_000, max: 8, keyPrefix: "forgot" }),
  (req: AuthedRequest, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const user = findUserByEmail(parsed.data.email);
    let resetUrl: string | null = null;

    if (user) {
      const raw = randomToken(32);
      getDb().passwordResets.push({
        tokenHash: sha256(raw),
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        usedAt: null,
      });
      saveDb();
      audit({
        actorId: user.id,
        actorName: user.fullName,
        action: "auth.password_reset_requested",
        entityType: "auth",
        entityId: user.id,
        summary: `Password reset requested for ${user.email}.`,
        before: null,
        after: null,
      });
      if (isDemoMode()) resetUrl = `${baseUrl(req)}/reset-password?token=${raw}`;
    }

    // Same response whether or not the address exists.
    res.json({
      message:
        "If an account exists for that address, password reset instructions have been created.",
      demoMode: isDemoMode(),
      resetUrl,
    });
  },
);

const resetSchema = z
  .object({
    token: z.string().min(10, "This reset link is invalid."),
    password: z.string().min(10, "Use at least 10 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

authRouter.post(
  "/reset-password",
  rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "reset" }),
  (req, res) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const issues = passwordIssues(parsed.data.password);
    if (issues.length) {
      res.status(400).json({ error: issues[0], fieldErrors: { password: issues } });
      return;
    }
    const hash = sha256(parsed.data.token);
    const database = getDb();
    const record = database.passwordResets.find((r) => r.tokenHash === hash);
    if (
      !record ||
      record.usedAt ||
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }
    const user = findUserById(record.userId);
    if (!user) {
      res.status(400).json({ error: "This reset link is invalid." });
      return;
    }
    user.passwordHash = hashPassword(parsed.data.password);
    record.usedAt = new Date().toISOString();
    database.sessions = database.sessions.filter((s) => s.userId !== user.id);
    saveDb();
    audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "auth.password_reset",
      entityType: "auth",
      entityId: user.id,
      summary: `Password reset completed for ${user.email}.`,
      before: null,
      after: null,
    });
    res.json({ message: "Password updated. Sign in with your new password." });
  },
);

authRouter.post("/verify-email", (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (token.length < 10) {
    res.status(400).json({ error: "This verification link is invalid." });
    return;
  }
  const hash = sha256(token);
  const user = getDb().users.find((u) => u.verificationTokenHash === hash);
  if (
    !user ||
    !user.verificationExpiresAt ||
    new Date(user.verificationExpiresAt).getTime() < Date.now()
  ) {
    res.status(400).json({ error: "This verification link is invalid or has expired." });
    return;
  }
  user.emailVerified = true;
  user.verificationTokenHash = null;
  user.verificationExpiresAt = null;
  saveDb();
  audit({
    actorId: user.id,
    actorName: user.fullName,
    action: "auth.verify_email",
    entityType: "auth",
    entityId: user.id,
    summary: `Verified email address for ${user.email}.`,
    before: { emailVerified: false },
    after: { emailVerified: true },
  });
  res.json({ message: "Email verified. You can now sign in." });
});

authRouter.post(
  "/resend-verification",
  rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "resend-verify" }),
  (req: AuthedRequest, res) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const user = findUserByEmail(parsed.data.email);
    const demo = isDemoMode();
    let verificationUrl: string | null = null;

    if (user && user.authProvider === "local" && !user.emailVerified) {
      const rawToken = randomToken(24);
      user.verificationTokenHash = sha256(rawToken);
      user.verificationExpiresAt = new Date(Date.now() + 24 * 3_600_000).toISOString();
      saveDb();
      audit({
        actorId: user.id,
        actorName: user.fullName,
        action: "auth.resend_verification",
        entityType: "auth",
        entityId: user.id,
        summary: `Reissued verification link for ${user.email}.`,
        before: null,
        after: null,
      });
      if (demo) {
        verificationUrl = `${baseUrl(req)}/verify-email?token=${rawToken}`;
      }
    }

    res.json({
      message:
        "If an unverified local account exists for that email, a fresh verification link has been created.",
      demoMode: demo,
      verificationUrl,
    });
  },
);

authRouter.patch("/profile", requireAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().regex(PHONE_RE).nullable().optional(),
    state: z.string().trim().min(2).optional(),
    city: z.string().trim().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const user = req.user!;
  const before = {
    fullName: user.fullName,
    phone: user.phone,
    state: user.state,
    city: user.city,
  };
  if (parsed.data.fullName) user.fullName = parsed.data.fullName;
  if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
  if (parsed.data.city) {
    const matchedCity = CITIES.find(
      (c) =>
        c.slug === parsed.data.city ||
        c.id === parsed.data.city ||
        c.name.toLowerCase() === parsed.data.city!.toLowerCase(),
    );
    if (matchedCity) {
      user.city = matchedCity.slug;
      user.state = matchedCity.state;
    } else {
      user.city = parsed.data.city;
      if (parsed.data.state) user.state = parsed.data.state;
    }
  } else if (parsed.data.state) {
    user.state = parsed.data.state;
  }
  saveDb();
  audit({
    actorId: user.id,
    actorName: user.fullName,
    action: "auth.profile_update",
    entityType: "auth",
    entityId: user.id,
    summary: `Updated profile details for ${user.email}.`,
    before,
    after: {
      fullName: user.fullName,
      phone: user.phone,
      state: user.state,
      city: user.city,
    },
  });
  res.json({ user: publicUser(user) });
});

authRouter.post("/change-password", requireAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(10, "Use at least 10 characters."),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const user = req.user!;
  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Current password is incorrect." });
    return;
  }
  const issues = passwordIssues(parsed.data.newPassword);
  if (issues.length) {
    res.status(400).json({ error: issues[0], fieldErrors: { newPassword: issues } });
    return;
  }
  user.passwordHash = hashPassword(parsed.data.newPassword);
  saveDb();
  audit({
    actorId: user.id,
    actorName: user.fullName,
    action: "auth.password_change",
    entityType: "auth",
    entityId: user.id,
    summary: `Changed password for ${user.email}.`,
    before: null,
    after: null,
  });
  res.json({ message: "Password changed." });
});
