import Link from "next/link";
import { notFound } from "next/navigation";
import { runDiagnosticEngine, type DiagnosticSeverity } from "@/lib/intelligence/diagnostics";
import AutoFixButton from "./AutoFixButton";

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
  const dot = (color: "RED" | "YELLOW" | "GREEN", background: string) => <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-block", background: state === color ? background : "#d1d5db", border: "1px solid rgba(0,0,0,.12)" }} />;
  return <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 10 }}>{dot("RED", "#dc2626")}{dot("YELLOW", "#eab308")}{dot("GREEN", "#16a34a")}<strong style={{ marginLeft: 4 }}>{state}</strong></div>;
}

type Props = { params: Promise<{ channelId: string }> };

export default async function ChannelDiagnosticsPage({ params }: Props) {
  const { channelId } = await params;
  const report = await runDiagnosticEngine(7);
  const channel = report.channels.find((item) => item.channelId === channelId);
  if (!channel) notFound();
  const findings = report.findings.filter((finding) => finding.channelId === channelId && finding.severity !== "HEALTHY");

  return <main>
    <header>
      <p className="eyebrow">Laughing Moose Gifts</p>
      <h1>{channel.channelName} Diagnostics</h1>
      <p className="subtitle">Current health, root-cause analysis and corrective action</p>
      <p><Link href="/diagnostics">← Diagnostic Center</Link></p>
    </header>

    <section className="panel">
      <div><p className="eyebrow">Platform Health</p><h2>{severityLabel[channel.health]}</h2><TrafficLight severity={channel.health} /></div>
      <div className="modules">
        <article className="module">
          <h3>Performance Snapshot</h3>
          <p><strong>{money(channel.currentRevenue)}</strong> current revenue<br />{pct(channel.revenueDeltaPct)} vs. prior 7 days</p>
          <p>{channel.currentUnits} units · {pct(channel.unitDeltaPct)} vs. baseline</p>
          <p>{channel.currentSessions ? `${channel.currentSessions} sessions` : "Traffic telemetry unavailable"}</p>
        </article>
      </div>
    </section>

    <section className="panel">
      <div><p className="eyebrow">Diagnostic Problems</p><h2>Issues and recommended response</h2></div>
      <div className="modules">
        {findings.length ? findings.map((finding, index) => (
          <article className="module" key={`${finding.layer}-${index}`}>
            <p className="eyebrow">{finding.layer.replaceAll("_", " ")} · {severityLabel[finding.severity]}</p>
            <h3>{finding.title}</h3>
            <p><strong>Observation:</strong> {finding.observation}</p>
            <p><strong>Likely cause:</strong> {finding.likelyCause}</p>
            <p><strong>Confidence:</strong> {(finding.confidence * 100).toFixed(0)}%</p>
            <p><strong>Recommended corrective action:</strong> {finding.recommendation}</p>
            <AutoFixButton channelId={finding.channelId} channelName={finding.channelName} layer={finding.layer} title={finding.title} observation={finding.observation} likelyCause={finding.likelyCause} recommendation={finding.recommendation} confidence={finding.confidence} />
          </article>
        )) : <article className="module"><p className="eyebrow">No active findings</p><h3>No material anomaly detected</h3><p>The current comparison window does not contain a diagnostic issue requiring corrective action for this platform.</p></article>}
      </div>
    </section>
  </main>;
}
