const scorecards = [
  { label: "Revenue", value: "—", note: "Sellerchamp + WooCommerce" },
  { label: "Orders", value: "—", note: "Sellerchamp" },
  { label: "Sessions", value: "—", note: "LMG Analytics" },
  { label: "Conversion", value: "—", note: "LMG Analytics" },
  { label: "Average Order", value: "—", note: "Calculated" },
];

const sections = [
  ["Product Intelligence", "Find high-conversion products that need traffic and high-traffic products that need corrective action."],
  ["Channel Intelligence", "Compare WooCommerce, marketplaces, Pinterest, email, social, search and referral performance."],
  ["Marketing Calendar", "Plan monthly themes, hero products, campaigns, creative, emails and promotional activity."],
  ["Recommendations", "Turn observations into approved, deferred, modified or rejected actions and measure the result."],
];

export default function Home() {
  return (
    <main>
      <header>
        <p className="eyebrow">Laughing Moose Gifts</p>
        <h1>Marketing Intelligence</h1>
        <p className="subtitle">Data → Observation → Recommendation → Decision → Action → Result</p>
      </header>

      <section className="scorecards">
        {scorecards.map((card) => (
          <article className="card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </section>

      <section className="panel">
        <div>
          <p className="eyebrow">Command Center</p>
          <h2>What needs attention?</h2>
        </div>
        <div className="empty-state">
          <strong>No intelligence generated yet.</strong>
          <p>Sellerchamp and LMG Analytics adapters will populate the first observations and recommendations.</p>
        </div>
      </section>

      <section className="modules">
        {sections.map(([title, description]) => (
          <article className="module" key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
