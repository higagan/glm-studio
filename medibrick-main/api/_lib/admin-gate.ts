import { createHmac, timingSafeEqual } from "crypto";
import type { VercelRequest } from "@vercel/node";

const GATE_SALT = "medibrick-founder-gate-v1";

function gateSecret(): string {
  return process.env.ADMIN_GATE_SECRET || process.env.ADMIN_PASSWORD || "";
}

/** Deterministic session token issued after password check (stateless). */
export function createAdminGateToken(): string {
  const secret = gateSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD is not configured");
  return createHmac("sha256", secret).update(GATE_SALT).digest("hex");
}

export function verifyAdminGateToken(token: string | null | undefined): boolean {
  if (!token || !gateSecret()) return false;
  try {
    const expected = createAdminGateToken();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getAdminGateBearer(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function requireAdminGate(req: VercelRequest): void {
  const token = getAdminGateBearer(req);
  if (!verifyAdminGateToken(token)) {
    const err = new Error("Unauthorized") as Error & { status: number };
    err.status = 401;
    throw err;
  }
}
