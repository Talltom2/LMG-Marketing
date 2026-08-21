import { db } from "@/lib/db";

const sections = [
  ["Product Intelligence", "Find high-conversion products that need traffic and high-traffic products that need corrective action."],
  ["Channel Intelligence", "Compare WooCommerce, marketplaces, Pinterest, email, social, search and referral performance."],
  ["Marketing Calendar", "Plan monthly themes, hero products, campaigns, creative, emails and promotional activity."],
  ["Recommendations", "Turn observations into approved, deferred, modified or rejected actions and measure the result."],
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [metrics, topProducts, channelTotals] = await Promise.all([
    db.commerceMetric.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }],
      },
      select: { units: true, revenue: true },
    }),
    db.commerceMetric.groupBy({
      by: ["productId"],
      where: {
        date: { gte: startDate, lte: endDate },
        OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }],
      },
      _sum: { units: true, revenue: true },
      orderBy: { _sum: { revenue: "desc" } },
      take: 5,
    }),
    db.commerceMetric.groupBy({
      by: ["channelId"],
      where: {
        date: { gte: startDate, lte: endDate },
        OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }],
      },
      _sum: { units: true, revenue: true },
      orderBy: { _sum: { revenue: "desc" } },
    }),
  ]);

  const revenue = metrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);
  const units = metrics.reduce((sum, metric) => sum + metric.units, 0);
  const averageOrder = units > 0 ? revenue / units : 0;

  const productIds = topProducts.map((item) => item.productId);
  const channelIds = channelTotals.map((item) => item.channelId);
  const [products, channels] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true, name: true } }),
    db.channel.findMany({ where: { id: { in: channelIds } }, select: { id: true, name: true } }),
  ]);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));

  const scorecards = [
    { label: "Revenue", value: money(revenue), note: "Sellerchamp · last 7 days" },
    { label: "Units", value: String(units), note: "Sellerchamp · last 7 days" },
    { label: "Sessions", value: "—", note: "LMG Analytics pending" },
    { label: "Conversion", value: "—", note: "LMG Analytics pending" },
    { label: "Avg. Revenue / Unit", value: money(averageOrder), note: "Calculated" },
  ];

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
          {revenue > 0 ? (
            <>
              <strong>Sellerchamp commerce data is live.</strong>
              <p>{money(revenue)} in revenue and {units} units are recorded for the last seven days. Funnel intelligence will activate when LMG Analytics is connected.</p>
            </>
          ) : (
            <>
              <strong>No current-period commerce activity yet.</strong>
              <p>Sellerchamp is connected; the dashboard will populate as qualifying sales are synchronized.</p>
            </>
          )}
        </div>
      </section>

      <section className="modules">
        <article className="module">
          <h3>Top Products · 7 days</h3>
          {topProducts.length ? topProducts.map((item) => {
            const product = productMap.get(item.productId);
            return <p key={item.productId}><strong>{product?.name ?? product?.sku ?? "Unknown product"}</strong><br />{item._sum.units ?? 0} units · {money(Number(item._sum.revenue ?? 0))}</p>;
          }) : <p>No qualifying sales in this period.</p>}
        </article>

        <article className="module">
          <h3>Channel Performance · 7 days</h3>
          {channelTotals.length ? channelTotals.map((item) => (
            <p key={item.channelId}><strong>{channelMap.get(item.channelId)?.name ?? "Unknown channel"}</strong><br />{item._sum.units ?? 0} units · {money(Number(item._sum.revenue ?? 0))}</p>
          )) : <p>No qualifying sales in this period.</p>}
        </article>

        {sections.slice(2).map(([title, description]) => (
          <article className="module" key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
