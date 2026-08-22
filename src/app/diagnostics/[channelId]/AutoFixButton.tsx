"use client";

import { useState } from "react";

type Props = {
  channelId: string;
  channelName: string;
  layer: string;
  title: string;
  observation: string;
  likelyCause: string;
  recommendation: string;
  confidence: number;
};

export default function AutoFixButton(props: Props) {
  const [status, setStatus] = useState<"idle" | "working" | "queued" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestFix() {
    const approved = window.confirm(`Approve LMG Marketing to automatically correct this issue where the connected platform API permits it?\n\n${props.title}`);
    if (!approved) return;

    setStatus("working");
    setMessage("");
    try {
      const response = await fetch("/api/diagnostics/auto-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message ?? "Unable to queue correction.");
      setStatus("queued");
      setMessage(body.message ?? "Automatic correction approved and queued.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to queue correction.");
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button type="button" onClick={requestFix} disabled={status === "working" || status === "queued"} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid currentColor", fontWeight: 700, cursor: status === "working" || status === "queued" ? "default" : "pointer" }}>
        {status === "working" ? "Preparing fix…" : status === "queued" ? "Fix approved ✓" : "Fix Automatically"}
      </button>
      {message && <p style={{ marginTop: 8 }}><small>{message}</small></p>}
    </div>
  );
}
