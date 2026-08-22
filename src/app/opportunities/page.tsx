import Link from "next/link";
import { priorityBand, scoreOpportunity } from "@/lib/opportunities";

const initialOpportunities = [
  {
    title: "Expand eligible Sellerchamp listings to Amazon US",
    channel: "Amazon US",
    type: "GROWTH",
    expectedAnnualRevenue: 12000,
    expectedAnnualProfit: 4200,
    successProbability: 0.72,
    confidence: 0.65,
    urgency: 4,
    effort: 2,
    risk: 1,
    automation: "APPROVE + EXECUTE",
    status: "Needs inventory/listing comparison",
  },
  {
    title: "Expand eligible Sellerchamp listings to Amazon Canada",
    channel: "Amazon Canada",
    type: "GROWTH",
    expectedAnnualRevenue: 7000,
    expectedAnnualProfit: 2450,
    successProbability: 0.62,
    confidence: 0.55,
    urgency: 3,
    effort: 2,
    risk: 2,
    automation: "APPROVE + EXECUTE",
    status: "Needs inventory/listing comparison",
  },
  {
    title: "Find Sellerchamp products absent from Walmart",
    channel: "Walmart",
    type: "GROWTH",
    expectedAnnualRevenue: 10000,
    expectedAnnualProfit: 3500,
    successProbability: 0.75,
    confidence: 0.6,
    urgency: 5,
    effort: 2,
    risk: 1,
    automation: "APPROVE + EXECUTE",
    status: "Walmart API connection in progress",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function OpportunitiesPage() {
  const ranked = initialOpportunities.map((item) => {
    const score = scoreOpportunity(item);
    return { ...item, score, priority: priorityBand(score) };
  }).sort((a, b) => b.score - a.score);

  const annualRevenueOpportunity = ranked.reduce((sum, item) => sum + item.expectedAnnualRevenue, 0);
  const annualProfitOpportunity = ranked.reduce((sum, item) => sum + item.expectedAnnualProfit, 0);

  return (
    <main>
      <header>
        <p className="eyebrow">Laughing Moose Gifts</p>
        <h1>Opportunities & Actions</h1>
        <p className="subtitle">Identify → Value → Prioritize → Approve → Execute → Measure → Learn</p>
        <p><Link href="/">← Command Center</Link> · <Link href="/diagnostics">Diagnostic Center</Link></p>
      </header>

      <section className="scorecards">
        <article className="card"><span>Identified Annual Revenue</span><strong>{money(annualRevenueOpportunity)}</strong><small>Initial modeled opportunities</small></article>
        <article className="card"><span>Identified Annual Profit</span><strong>{money(annualProfitOpportunity)}</strong><small>Estimated incremental contribution</small></article>
        <article className="card"><span>Open Opportunities</span><strong>{ranked.length}</strong><small>Growth queue</small></article>
      </section>

      <section className="panel">
        <div><p className="eyebrow">Priority Queue</p><h2>Highest-value work first</h2><p>Scores combine expected economic value, probability of success, confidence, urgency, effort and risk. Estimates are provisional until native marketplace data improves them.</p></div>
        <div className="modules">
          {ranked.map((item) => (
            <article className="module" key={item.title}>
              <p className="eyebrow">{item.priority} · SCORE {item.score}</p>
              <h3>{item.title}</h3>
              <p><strong>{item.channel}</strong> · {item.type}</p>
              <p>Annual revenue upside: <strong>{money(item.expectedAnnualRevenue)}</strong><br />Annual profit upside: <strong>{money(item.expectedAnnualProfit)}</strong></p>
              <p>Confidence: {Math.round(item.confidence * 100)}% · Automation: {item.automation}</p>
              <p>{item.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Execution Governance</p>
        <h2>Three automation levels</h2>
        <p><strong>Recommend only</strong> for high-risk or strategic decisions. <strong>Approve + execute</strong> for actions that can be automated after review. <strong>Auto-execute</strong> only for repetitive, low-risk actions explicitly authorized in advance.</p>
      </section>
    </main>
  );
}
