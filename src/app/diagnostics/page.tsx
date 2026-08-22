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
    <span
      aria-hidden="true"
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        display: "inline-block",
        background: state === color ? background : "#d1d5db",
        border: "1px solid rgba(0,0,0,.12)",
        boxShadow: state === color ? `0 0 0 3px ${background}22` : "none",
      }}
    />
  );

  return (
    <div aria-label={`${state.toLowerCase()} platform status`} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      {dot("RED", "#dc2626")}
      {dot("YELLOW", "#eab308")}
      {dot("GREEN", "#16a34a")}
      <strong style={{ marginLeft: 4 }}>{state}</strong>
    </div>
  );
}

type DiagnosticsPageProps = {
  searchParams?: Promise<{ channel?: string }>;
};

export default async function DiagnosticsPage({ searchParams }: DiagnosticsPageProps) {
  const report = await runDiagnosticEngine(7);
  const params = searchParams ? await searchParams : {};
  const selectedChannelId = params.channel ?? null;
  const selectedChannel = selectedChannelId ? report.channels.find((channel) => channel.channelId === selectedChannelId) : null;
  const selectedFindings = selectedChannelId
    ? report.findings.filter((finding) => finding.channelId === selectedChannelId && finding.severity !== "HEALTHY")
    : [];
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
          <p>Click any platform card to open its current diagnostic detail. Green = healthy, Yellow = watch/warning/data gap, Red = critical.</p>
        </div>
      </section>

      <section className="modules">
        {report.channels.map((channel) => {
          const selected = channel.channelId === selectedChannelId;
          return (
            <Link
              href={`/diagnostics?channel=${encodeURIComponent(channel.channelId)}#channel-diagnostics`}
              key={channel.channelId}
              style={{ color: "inherit", textDecoration: "none", display: "block" }}
              aria-label={`View ${channel.channelName} diagnostics`}
            >
              <article
                className="module"
                style={{
                  height: "100%",
                  cursor: "pointer",
                  outline: selected ? "2px solid currentColor" : "none",
                  outlineOffset: selected ? 2 : 0,
                }}
              >
                <TrafficLight severity={channel.health} />
                <p className="eyebrow">{severityLabel[channel.health]}</p>
                <h3>{channel.channelName}</h3>
                <p><strong>{money(channel.currentRevenue)}</strong> current revenue<br />{pct(channel.revenueDeltaPct)} vs. prior 7 days</p>
                <p>{channel.currentUnits} units · {pct(channel.unitDeltaPct)} vs. baseline</p>
                <p>{channel.currentSessions ? `${channel.currentSessions} sessions` : "Traffic telemetry unavailable"}</p>
                <p><strong>{selected ? "Viewing diagnostics ↓" : "Click for diagnostics →"}</strong></p>
              </article>
            </Link>
          );
        })}
      </section>

      <section className="panel" id="channel-diagnostics">
        {selectedChannel ? (
          <>
            <div>
              <p className="eyebrow">Selected Platform</p>
              <h2>{selectedChannel.channelName} diagnostics</h2>
              <TrafficLight severity={selectedChannel.health} />
            </div>

            <div className="modules">
              <article className="module">
                <p className="eyebrow">Performance Snapshot</p>
                <h3>{severityLabel[selectedChannel.health]}</h3>
                <p><strong>{money(selectedChannel.currentRevenue)}</strong> current revenue<br />{pct(selectedChannel.revenueDeltaPct)} vs. prior 7 days</p>
                <p>{selectedChannel.currentUnits} units · {pct(selectedChannel.unitDeltaPct)} vs. baseline</p>
                <p>{selectedChannel.currentSessions ? `${selectedChannel.currentSessions} sessions` : "Traffic telemetry unavailable"}</p>
              </article>

              {selectedFindings.length ? selectedFindings.map((finding, index) => (
                <article className="module" key={`${finding.channelId}-${finding.layer}-${index}`}>
                  <p className="eyebrow">{finding.layer.replaceAll("_", " ")} · {severityLabel[finding.severity]}</p>
                  <h3>{finding.title}</h3>
                  <p><strong>Observation:</strong> {finding.observation}</p>
                  <p><strong>Likely cause:</strong> {finding.likelyCause}</p>
                  <p><strong>Confidence:</strong> {(finding.confidence * 100).toFixed(0)}%</p>
                  <p><strong>Recommended corrective action:</strong> {finding.recommendation}</p>
                </article>
              )) : (
                <article className="module">
                  <p className="eyebrow">No active findings</p>
                  <h3>No material anomaly detected</h3>
                  <p>The current comparison window does not contain a diagnostic issue requiring corrective action for this platform.</p>
                </article>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>Select a platform above</strong>
            <p>Its diagnostic observations, likely causes, confidence levels and recommended corrective actions will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
