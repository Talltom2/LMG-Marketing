import { NextResponse } from "next/server";
import { getWalmartAccessToken, walmartConfigured } from "@/lib/integrations/walmart/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!walmartConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "Walmart Marketplace credentials are not configured.",
    });
  }

  try {
    const token = await getWalmartAccessToken();
    return NextResponse.json({
      configured: true,
      connected: true,
      expiresIn: token.expires_in ?? null,
      message: "Walmart Marketplace authentication succeeded.",
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      message: error instanceof Error ? error.message : "Walmart Marketplace authentication failed.",
    }, { status: 502 });
  }
}
