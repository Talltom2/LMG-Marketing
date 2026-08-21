import type { NextRequest } from "next/server";

export function requireInternalSecret(request: NextRequest) {
  const expected = process.env.LMG_INTERNAL_SYNC_SECRET;
  if (!expected) throw new Error("LMG_INTERNAL_SYNC_SECRET is not configured");

  const supplied = request.headers.get("x-lmg-sync-secret");
  if (!supplied || supplied !== expected) {
    const error = new Error("Unauthorized");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
}
