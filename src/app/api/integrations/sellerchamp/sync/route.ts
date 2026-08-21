import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret } from "@/lib/internal-auth";
import { syncSellerchamp } from "@/lib/integrations/sellerchamp/sync";

export async function POST(request: NextRequest) {
  try {
    requireInternalSecret(request);
    const body = await request.json().catch(() => ({}));
    const endDate = body.endDate ? new Date(body.endDate) : new Date();
    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate or endDate" }, { status: 400 });
    }

    const result = await syncSellerchamp(startDate, endDate);
    return NextResponse.json({ ok: true, startDate, endDate, result });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown Sellerchamp sync error" },
      { status },
    );
  }
}
