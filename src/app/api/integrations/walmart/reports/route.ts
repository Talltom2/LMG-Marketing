import { NextRequest, NextResponse } from "next/server";
import { downloadWalmartReport, getWalmartReportStatus, parseCsv, requestItemPerformanceReport, requestSearchInsightsReport } from "@/lib/integrations/walmart/reports";

export const dynamic = "force-dynamic";

const num = (value: string | undefined) => {
  const n = Number(String(value ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function summarizeItemPerformance(rows: Record<string, string>[]) {
  const total = (name: string) => rows.reduce((sum, row) => sum + num(row[name]), 0);
  const visits = total("Total Product Visits");
  const units = total("Total Units");
  return {
    rows: rows.length,
    gmv: total("GMV"),
    units,
    authorizedOrders: total("Authorized Orders"),
    visits,
    productPageviews: total("Product Level Pageviews"),
    refundedSales: total("Refunded Sales"),
    conversionRate: visits > 0 ? units / visits : null,
  };
}

function summarizeSearchInsights(rows: Record<string, string>[]) {
  const rankColumns = ["Impressions Rank", "Clicks Rank", "Added to Cart Rank", "Sales Rank"];
  const avg = (column: string) => {
    const values = rows.map((r) => num(r[column])).filter((v) => v > 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const keywordColumn = Object.keys(rows[0] ?? {}).find((k) => /keyword recommendation/i.test(k));
  const buyBoxColumn = Object.keys(rows[0] ?? {}).find((k) => /buy box win/i.test(k));
  const buyBoxValues = buyBoxColumn ? rows.map((r) => num(r[buyBoxColumn])).filter((v) => v >= 0) : [];
  return {
    rows: rows.length,
    averageRanks: Object.fromEntries(rankColumns.map((c) => [c, avg(c)])),
    keywordRecommendationRows: keywordColumn ? rows.filter((r) => String(r[keywordColumn]).trim()).length : null,
    averageBuyBoxWinPct: buyBoxValues.length ? buyBoxValues.reduce((a, b) => a + b, 0) / buyBoxValues.length : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const kind = body?.kind === "SEARCH_INSIGHTS" ? "SEARCH_INSIGHTS" : "ITEM_PERFORMANCE";
    const report = kind === "SEARCH_INSIGHTS" ? await requestSearchInsightsReport() : await requestItemPerformanceReport(14);
    return NextResponse.json({ kind, ...report });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to request Walmart report." }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  const kind = request.nextUrl.searchParams.get("kind") === "SEARCH_INSIGHTS" ? "SEARCH_INSIGHTS" : "ITEM_PERFORMANCE";
  if (!requestId) return NextResponse.json({ message: "requestId is required." }, { status: 400 });
  try {
    const status = await getWalmartReportStatus(requestId);
    const requestStatus = status.requestStatus ?? status.status;
    if (requestStatus !== "READY") return NextResponse.json({ kind, ...status, ready: false });
    const csv = await downloadWalmartReport(requestId);
    const rows = parseCsv(csv);
    const summary = kind === "SEARCH_INSIGHTS" ? summarizeSearchInsights(rows) : summarizeItemPerformance(rows);
    return NextResponse.json({ kind, ...status, ready: true, summary });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to retrieve Walmart report." }, { status: 502 });
  }
}
