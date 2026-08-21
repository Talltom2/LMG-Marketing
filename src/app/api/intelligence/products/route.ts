import { NextRequest, NextResponse } from "next/server";
import { getProductIntelligence } from "@/lib/intelligence/products";

export async function GET(request: NextRequest) {
  try {
    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? 30), 1), 365);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const products = await getProductIntelligence(startDate, endDate);

    return NextResponse.json({ startDate, endDate, days, products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to calculate product intelligence" },
      { status: 500 },
    );
  }
}
