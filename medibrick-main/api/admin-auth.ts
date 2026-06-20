import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  checkAdminPassword,
  createAdminGateToken,
  verifyAdminGateToken,
  getAdminGateBearer,
} from "./_lib/admin-gate.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(503).json({ error: "Admin gate not configured" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const password = String(body.password ?? "");

    if (!checkAdminPassword(password)) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    return res.status(200).json({ token: createAdminGateToken() });
  }

  if (req.method === "GET") {
    const token = getAdminGateBearer(req);
    if (verifyAdminGateToken(token)) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ ok: false });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
