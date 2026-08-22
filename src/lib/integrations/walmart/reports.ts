import { walmartRawRequest, walmartRequest } from "./client";

export type WalmartReportStatus = {
  requestId: string;
  requestStatus?: "RECEIVED" | "INPROGRESS" | "READY" | "ERROR";
  status?: string;
  reportType?: string;
  reportVersion?: string;
  downloadUrl?: string;
};

export async function requestItemPerformanceReport(days = 14): Promise<WalmartReportStatus> {
  const end = new Date();
  const start = new Date(end.getTime() - Math.min(days, 15) * 86400000);
  return walmartRequest<WalmartReportStatus>("/v3/reports/reportRequests?reportType=ITEM_PERFORMANCE&reportVersion=v3", {
    method: "POST",
    body: JSON.stringify({
      format: "CSV",
      dataStartTime: start.toISOString(),
      dataEndTime: end.toISOString(),
      dateGranularity: "DAILY",
    }),
  });
}

export async function requestSearchInsightsReport(): Promise<WalmartReportStatus> {
  return walmartRequest<WalmartReportStatus>("/v3/reports/reportRequests?reportType=SEARCH_INSIGHTS_PERF_REPORT&reportVersion=v1", {
    method: "POST",
    body: JSON.stringify({ rowFilters: [], excludeColumns: [] }),
  });
}

export async function getWalmartReportStatus(requestId: string): Promise<WalmartReportStatus> {
  return walmartRequest<WalmartReportStatus>(`/v3/reports/reportRequests/${encodeURIComponent(requestId)}`);
}

export async function downloadWalmartReport(requestId: string): Promise<string> {
  const response = await walmartRawRequest(`/v3/reports/downloadReport?requestId=${encodeURIComponent(requestId)}`, {
    headers: { Accept: "text/csv,application/json" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (contentType.includes("csv") || text.includes("\n")) return text;
  try {
    const body = JSON.parse(text);
    const url = body.downloadUrl ?? body.url ?? body?.data?.downloadUrl ?? body?.data?.url;
    if (!url) return text;
    const downloaded = await fetch(url, { cache: "no-store" });
    if (!downloaded.ok) throw new Error(`Walmart report download failed (${downloaded.status}).`);
    return downloaded.text();
  } catch {
    return text;
  }
}

export function parseCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(field); field = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.length)) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift()?.map((h) => h.trim()) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}
