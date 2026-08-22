"use client";

import { useState } from "react";

type Kind = "ITEM_PERFORMANCE" | "SEARCH_INSIGHTS";
type ReportState = { status: string; requestId?: string; summary?: any; error?: string };

export default function WalmartDeepReports() {
  const [reports, setReports] = useState<Record<Kind, ReportState>>({
    ITEM_PERFORMANCE: { status: "idle" },
    SEARCH_INSIGHTS: { status: "idle" },
  });

  function patch(kind: Kind, update: Partial<ReportState>) {
    setReports((prev) => ({ ...prev, [kind]: { ...prev[kind], ...update } }));
  }

  async function poll(kind: Kind, requestId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch(`/api/integrations/walmart/reports?kind=${kind}&requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { patch(kind, { status: "error", error: body?.message ?? "Report retrieval failed." }); return; }
      if (body.ready) { patch(kind, { status: "ready", summary: body.summary }); return; }
      patch(kind, { status: String(body.requestStatus ?? body.status ?? "processing").toLowerCase() });
    }
    patch(kind, { status: "processing", error: "Walmart is still preparing this report. Refresh it again shortly." });
  }

  async function requestReport(kind: Kind) {
    patch(kind, { status: "requesting", error: undefined, summary: undefined });
    try {
      const response = await fetch("/api/integrations/walmart/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const body = await response.json();
      if (!response.ok || !body.requestId) throw new Error(body?.message ?? "Walmart did not return a report request ID.");
      patch(kind, { status: "received", requestId: body.requestId });
      void poll(kind, body.requestId);
    } catch (error) {
      patch(kind, { status: "error", error: error instanceof Error ? error.message : "Unable to request report." });
    }
  }

  const item = reports.ITEM_PERFORMANCE;
  const search = reports.SEARCH_INSIGHTS;

  return (
    <section className="panel">
      <div><p className="eyebrow">Deep Walmart Evidence</p><h2>Performance & Search Insights</h2><p>These Walmart-native reports take longer to generate than the live diagnostics above. Refresh them when you want deeper sales/conversion and search-ranking evidence.</p></div>
      <div className="modules">
        <article className="module">
          <h3>Item Performance · 14 days</h3>
          <button type="button" onClick={() => requestReport("ITEM_PERFORMANCE")} disabled={["requesting","received","inprogress"].includes(item.status)} style={{padding:"10px 14px",borderRadius:8,fontWeight:700}}>Refresh Item Performance</button>
          <p>Status: <strong>{item.status}</strong></p>
          {item.summary && <p>GMV: <strong>${Number(item.summary.gmv ?? 0).toFixed(2)}</strong><br/>Units: {item.summary.units ?? 0}<br/>Orders: {item.summary.authorizedOrders ?? 0}<br/>Product visits: {item.summary.visits ?? 0}<br/>Pageviews: {item.summary.productPageviews ?? 0}<br/>Observed conversion: {item.summary.conversionRate == null ? "—" : `${(item.summary.conversionRate*100).toFixed(2)}%`}</p>}
          {item.error && <p><small>{item.error}</small></p>}
        </article>
        <article className="module">
          <h3>Search Insights · previous week</h3>
          <button type="button" onClick={() => requestReport("SEARCH_INSIGHTS")} disabled={["requesting","received","inprogress"].includes(search.status)} style={{padding:"10px 14px",borderRadius:8,fontWeight:700}}>Refresh Search Insights</button>
          <p>Status: <strong>{search.status}</strong></p>
          {search.summary && <p>Items analyzed: {search.summary.rows ?? 0}<br/>Keyword recommendations: {search.summary.keywordRecommendationRows ?? "—"}<br/>Avg. Buy Box win: {search.summary.averageBuyBoxWinPct == null ? "—" : `${Number(search.summary.averageBuyBoxWinPct).toFixed(1)}%`}</p>}
          {search.error && <p><small>{search.error}</small></p>}
        </article>
      </div>
    </section>
  );
}
