"use client";

import { FormEvent, useState } from "react";

export default function SellerchampAdminPage() {
  const [secret, setSecret] = useState("");
  const [days, setDays] = useState(7);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);

  async function runSync(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setStatus("Starting Sellerchamp sync…");

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      const response = await fetch("/api/integrations/sellerchamp/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lmg-internal-secret": secret,
        },
        body: JSON.stringify({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Sync failed (${response.status})`);
      setStatus(JSON.stringify(body, null, 2));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown sync error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Laughing Moose Gifts</p>
        <h1>Sellerchamp Sync</h1>
        <p className="subtitle">Internal control for importing product and commerce performance into LMG Marketing Intelligence.</p>
      </header>

      <section className="panel" style={{ gridTemplateColumns: "1fr" }}>
        <form onSubmit={runSync} style={{ display: "grid", gap: 16, maxWidth: 620 }}>
          <label>
            <strong>Internal sync secret</strong>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              autoComplete="off"
              required
              style={{ display: "block", width: "100%", marginTop: 8, padding: 12 }}
            />
          </label>

          <label>
            <strong>Import window</strong>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              style={{ display: "block", width: "100%", marginTop: 8, padding: 12 }}
            >
              <option value={1}>Last 1 day</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>

          <button type="submit" disabled={running} style={{ padding: 14, fontWeight: 700, cursor: running ? "wait" : "pointer" }}>
            {running ? "Syncing…" : "Run Sellerchamp Sync"}
          </button>
        </form>

        {status ? (
          <pre style={{ marginTop: 24, padding: 18, overflow: "auto", background: "#f7f8f5", borderRadius: 12, whiteSpace: "pre-wrap" }}>
            {status}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
