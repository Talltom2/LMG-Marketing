import Link from "next/link";
import { runDiagnosticEngine, type DiagnosticSeverity } from "@/lib/intelligence/diagnostics";

export const dynamic = "force-dynamic";

const severityLabel: Record<DiagnosticSeverity, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  WATCH: "Watch",
  HEALTHY: "Healthy",
  DATA_GAP: "Data gap",
};

const pct = (value: number | null) => value == null ? "—" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(0)}%`;
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default async function DiagnosticsPage() {
  const report = await runDiagnosticEngine(7);
  const actionable = report.findings.filter((finding) => finding.severity !== "HEALTHY");

  return (
    <main>
      <header>
        <p className="eyebrow">Laughing Moose Gifts</p>
        <h1>Diagnostic Center</h1>
        <p className="subtitle">Expected → Actual → Anomaly → Cause → Recommendation → Corrective Action → Learning</p>
        <p><Link href="/">← Marketing Intelligence</Link></p>
      </header>

      <section className="panel">
        <div>
          <p className="eyebrow">Diagnostic Engine</p>
          <h2>What needs attention?</h2>
        </div>
        <div className="empty-state">
          <strong>{actionable.length} diagnostic signals detected</strong>
          <p>The engine compares the latest seven days with the preceding seven-day baseline, then uses funnel evidence to distinguish visibility/traffic loss from conversion deterioration when the data is available.</p>
        </div>
      </section>

      <section className="modules">
        {report.channels.map((channel) => (
          <article className="module" key={channel.channelId}>
            <p className="eyebrow">{severityLabel[channel.health]}</p>
            <h3>{channel.channelName}</h3>
            <p><strong>{money(channel.currentRevenue)}</strong> current revenue<br />{pct(channel.revenueDeltaPct)} vs. prior 7 days</p>
            <p>{channel.currentUnits} units · {pct(channel.unitDeltaPct)} vs. baseline</p>
            <p>{channel.currentSessions ? `${channel.currentSessions} sessions` : "Traffic telemetry unavailable"}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div>
          <p className="eyebrow">Findings</p>
          <h2>Diagnosis and recommended response</h2>
        </div>
        <div>
          {actionable.length ? actionable.map((finding, index) => (
            <article className="module" key={`${finding.channelId}-${finding.layer}-${index}`} style={{ marginBottom: 16 }}>
              <p className="eyebrow">{finding.channelName} · {finding.layer.replaceAll("_", " ")} · {severityLabel[finding.severity]}</p>
              <h3>{finding.title}</h3>
              <p><strong>Observation:</strong> {finding.observation}</p>
              <p><strong>Likely cause:</strong> {finding.likelyCause}</p>
              <p><strong>Confidence:</strong> {(finding.confidence * 100).toFixed(0)}%</p>
              <p><strong>Recommended corrective action:</strong> {finding.recommendation}</p>
            </article>
          )) : <p>No material anomalies were detected in the current comparison window.</p>}
        </div>
      </section>

      <section className="panel">
        <div>
          <p className="eyebrow">Diagnostic Layers</p>
          <h2>Full target architecture</h2>
        </div>
        <div className="empty-state">
          <p><strong>1. Catalog health</strong> → published/suppressed, inventory, fulfillment, category/product type, Buy Box/offer.</p>
          <p><strong>2. Visibility</strong> → impressions, search exposure, marketplace discoverability.</p>
          <p><strong>3. Traffic</strong> → sessions, clicks, product views.</p>
          <p><strong>4. Offer</strong> → price, shipping promise, competitiveness.</p>
          <p><strong>5. Conversion</strong> → carts, checkout, purchases, conversion rate.</p>
          <p><strong>6. Creative</strong> → image/copy/ad performance.</p>
          <p><strong>7. Comparison</strong> → channel, product, campaign, historical and external/category demand.</p>
        </div>
      </section>
    </main>
  );
}
