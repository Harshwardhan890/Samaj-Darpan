import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { UserRole } from "../src/shared/types";
import {
  findUserById,
  getDb,
  saveDb,
  sessionUser,
  type UserRecord,
} from "./db";

export const SESSION_COOKIE = "sd_session";

export interface AuthedRequest extends Request {
  user?: UserRecord;
}

const roleRank: Record<UserRole, number> = { citizen: 1, official: 2, admin: 3 };

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function supabaseUser(token: string): Promise<UserRecord | null> {
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    let jwks = jwksCache.get(url);
    if (!jwks) {
      jwks = createRemoteJWKSet(
        new URL(`${url.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`),
      );
      jwksCache.set(url, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${url.replace(/\/$/, "")}/auth/v1`,
      audience: "authenticated",
    });
    const sub = String(payload.sub ?? "");
    if (!sub) return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
    // Only app_metadata is trusted for authorisation: user_metadata is writable
    // by the account holder and must never grant official/admin access.
    const claimedRole = String(appMeta.role ?? "citizen");
    const role: UserRole =
      claimedRole === "admin" ? "admin" : claimedRole === "official" ? "official" : "citizen";

    const database = getDb();
    const id = `sb_${sub}`;
    let user = findUserById(id);
    if (!user) {
      user = {
        id,
        fullName:
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          email.split("@")[0] ||
          "Citizen",
        email,
        phone: typeof meta.phone === "string" ? meta.phone : null,
        passwordHash: null,
        role,
        state: typeof meta.state === "string" ? meta.state : null,
        city: typeof meta.city === "string" ? meta.city : null,
        avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
        emailVerified: Boolean(payload.email_verified),
        verificationTokenHash: null,
        verificationExpiresAt: null,
        authProvider: "supabase",
        officialVerified: role === "admin",
        followedProjectIds: [],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      database.users.push(user);
      saveDb();
    } else {
      user.role = role;
      user.emailVerified = Boolean(payload.email_verified);
      user.lastLoginAt = new Date().toISOString();
      saveDb();
    }
    return user;
  } catch {
    return null;
  }
}

export async function resolveUser(req: Request): Promise<UserRecord | null> {
  const cookieToken = (req as Request & { cookies?: Record<string, string> })
    .cookies?.[SESSION_COOKIE];
  const fromCookie = sessionUser(cookieToken);
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return supabaseUser(header.slice(7));
  }
  return null;
}

export async function attachUser(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    req.user = (await resolveUser(req)) ?? undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}

export function requireRole(minimum: UserRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    if (roleRank[req.user.role] < roleRank[minimum]) {
      res.status(403).json({ error: "You do not have permission to do that." });
      return;
    }
    next();
  };
}

export function roleAtLeast(user: UserRecord | undefined, minimum: UserRole): boolean {
  return Boolean(user && roleRank[user.role] >= roleRank[minimum]);
}
