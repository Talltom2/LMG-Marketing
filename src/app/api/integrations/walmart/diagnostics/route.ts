import { NextResponse } from "next/server";
import { getWalmartDiagnosticSnapshot } from "@/lib/integrations/walmart/diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getWalmartDiagnosticSnapshot();
    return NextResponse.json({ connected: true, snapshot });
  } catch (error) {
    return NextResponse.json({ connected: false, message: error instanceof Error ? error.message : "Unable to load Walmart diagnostics." }, { status: 502 });
  }
}
