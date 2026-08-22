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

function trafficState(severity: DiagnosticSeverity) {
  if (severity === "CRITICAL") return "RED";
  if (severity === "HEALTHY") return "GREEN";
  return "YELLOW";
}

function TrafficLight({ severity }: { severity: DiagnosticSeverity }) {
  const state = trafficState(severity);
  const dot = (color: "RED" | "YELLOW" | "GREEN", background: string) => (
    <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-block", background: state === color ? background : "#d1d5db", border: "1px solid rgba(0,0,0,.12)", boxShadow: state === color ? `0 0 0 3px ${background}22` : "none" }} />
  );
  return <div aria-label={`${state.toLowerCase()} platform status`} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>{dot("RED", "#dc2626")}{dot("YELLOW", "#eab308")}{dot("GREEN", "#16a34a")}<strong style={{ marginLeft: 4 }}>{state}</strong></div>;
}

export default async function DiagnosticsPage() {
  const report = await runDiagnosticEngine(7);
  const actionable = report.findings.filter((finding) => finding.severity !== "HEALTHY");

  return <main>
    <header>
      <p className="eyebrow">Laughing Moose Gifts</p>
      <h1>Diagnostic Center</h1>
      <p className="subtitle">Expected → Actual → Anomaly → Cause → Recommendation → Corrective Action → Learning</p>
      <p><Link href="/">← Marketing Intelligence</Link></p>
    </header>

    <section className="panel">
      <div><p className="eyebrow">Diagnostic Engine</p><h2>What needs attention?</h2></div>
      <div className="empty-state">
        <strong>{actionable.length} diagnostic signals detected</strong>
        <p>Click any platform card to open that platform’s detailed diagnostics in a separate browser window/tab. Green = healthy, Yellow = watch/warning/data gap, Red = critical.</p>
      </div>
    </section>

    <section className="modules">
      {report.channels.map((channel) => (
        <Link
          href={`/diagnostics/${encodeURIComponent(channel.channelId)}`}
          target="_blank"
          rel="noopener noreferrer"
          key={channel.channelId}
          style={{ color: "inherit", textDecoration: "none", display: "block" }}
          aria-label={`Open ${channel.channelName} diagnostics in a new window`}
        >
          <article className="module" style={{ height: "100%", cursor: "pointer" }}>
            <TrafficLight severity={channel.health} />
            <p className="eyebrow">{severityLabel[channel.health]}</p>
            <h3>{channel.channelName}</h3>
            <p><strong>{money(channel.currentRevenue)}</strong> current revenue<br />{pct(channel.revenueDeltaPct)} vs. prior 7 days</p>
            <p>{channel.currentUnits} units · {pct(channel.unitDeltaPct)} vs. baseline</p>
            <p>{channel.currentSessions ? `${channel.currentSessions} sessions` : "Traffic telemetry unavailable"}</p>
            <p><strong>Open diagnostics ↗</strong></p>
          </article>
        </Link>
      ))}
    </section>
  </main>;
}
