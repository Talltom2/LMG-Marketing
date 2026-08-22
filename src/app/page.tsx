import Link from "next/link";
import { db } from "@/lib/db";

const sections = [
  ["Marketing Calendar", "Plan monthly themes, hero products, campaigns, creative, emails and promotional activity."],
  ["Recommendations", "Turn observations into approved, deferred, modified or rejected actions and measure the result."],
];

const channelCards = [
  { type: "WALMART", label: "Walmart", phase: "Building now", detail: "Marketplace sales, catalog health, visibility, WFS and conversion diagnosis" },
  { type: "WOOCOMMERCE", label: "WooCommerce", phase: "Building now", detail: "Sessions → product views → cart → checkout → purchase" },
  { type: "PINTEREST", label: "Pinterest", phase: "Building now", detail: "Traffic, catalog, content and attributed WooCommerce revenue" },
  { type: "META", label: "Facebook / Instagram", phase: "Next", detail: "Organic social, catalog and Meta Ads performance" },
  { type: "AMAZON_US", label: "Amazon US", phase: "Next", detail: "Marketplace sales, inventory, listing and conversion health" },
  { type: "AMAZON_CA", label: "Amazon Canada", phase: "Next", detail: "Marketplace sales, inventory, listing and conversion health" },
  { type: "BING", label: "Bing / Microsoft", phase: "Next", detail: "Search visibility, Shopping, ads and attributed revenue" },
  { type: "TIKTOK", label: "TikTok", phase: "Next", detail: "Catalog, content, Pixel / Events API, Shop and campaign performance" },
  { type: "GOOGLE", label: "Google", phase: "Later", detail: "Search, Merchant Center, Shopping and ads health" },
  { type: "EMAIL", label: "Email", phase: "Later", detail: "Campaign delivery, clicks, conversion and revenue" },
] as const;

function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
export const dynamic = "force-dynamic";

export default async function Home() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [metrics, topProducts, channelTotals, allChannels] = await Promise.all([
    db.commerceMetric.findMany({ where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, select: { units: true, revenue: true } }),
    db.commerceMetric.groupBy({ by: ["productId"], where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, _sum: { units: true, revenue: true }, orderBy: { _sum: { revenue: "desc" } }, take: 5 }),
    db.commerceMetric.groupBy({ by: ["channelId"], where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, _sum: { units: true, revenue: true }, orderBy: { _sum: { revenue: "desc" } } }),
    db.channel.findMany({ select: { id: true, type: true, name: true, active: true } }),
  ]);
  const revenue = metrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);
  const units = metrics.reduce((sum, metric) => sum + metric.units, 0);
  const averageOrder = units > 0 ? revenue / units : 0;
  const [products, channels] = await Promise.all([
    db.product.findMany({ where: { id: { in: topProducts.map((i) => i.productId) } }, select: { id: true, sku: true, name: true } }),
    db.channel.findMany({ where: { id: { in: channelTotals.map((i) => i.channelId) } }, select: { id: true, name: true, type: true } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const channelMap = new Map(channels.map((c) => [c.id, c]));
  const channelTotalsMap = new Map(channelTotals.map((i) => [i.channelId, i]));
  const scorecards = [
    { label: "Revenue", value: money(revenue), note: "Sellerchamp · last 7 days" }, { label: "Units", value: String(units), note: "Sellerchamp · last 7 days" },
    { label: "Sessions", value: "—", note: "LMG Analytics pending" }, { label: "Conversion", value: "—", note: "LMG Analytics pending" }, { label: "Avg. Revenue / Unit", value: money(averageOrder), note: "Calculated" },
  ];
  return <main>
    <header><p className="eyebrow">Laughing Moose Gifts</p><h1>Marketing Intelligence</h1><p className="subtitle">Data → Observation → Diagnosis → Opportunity → Decision → Action → Result → Learning</p><p><Link href="/diagnostics">Diagnostic Center →</Link> · <Link href="/opportunities">Opportunities & Actions →</Link></p></header>
    <section className="scorecards">{scorecards.map((card) => <article className="card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
    <section className="panel"><div><p className="eyebrow">Command Center</p><h2>What needs attention?</h2></div><div className="empty-state"><strong>{revenue > 0 ? "Sellerchamp commerce data is live." : "No current-period commerce activity yet."}</strong><p>{revenue > 0 ? `${money(revenue)} in revenue and ${units} units are recorded for the last seven days.` : "Sellerchamp is connected; the dashboard will populate as qualifying sales are synchronized."}</p><p><Link href="/opportunities">Open prioritized opportunity queue →</Link></p></div></section>
    <section className="panel"><div><p className="eyebrow">Channel Command Center</p><h2>LMG marketing ecosystem</h2><p>Each channel becomes a health card as its native telemetry is connected. Walmart, WooCommerce and Pinterest are the current build phase.</p></div><div className="modules">{channelCards.map((card) => { const matching = allChannels.filter((c) => c.type === card.type); const live = matching.reduce((a,c) => { const t=channelTotalsMap.get(c.id); return {units:a.units+(t?._sum.units??0),revenue:a.revenue+Number(t?._sum.revenue??0)};},{units:0,revenue:0}); const connected=matching.some((c)=>c.active); const status=live.revenue>0||live.units>0?"LIVE":connected?"CONNECTED":card.phase.toUpperCase(); return <article className="module" key={card.type}><p className="eyebrow">{status}</p><h3>{card.label}</h3>{live.revenue>0||live.units>0?<p><strong>{money(live.revenue)}</strong><br/>{live.units} units · last 7 days</p>:<p><strong>{card.phase}</strong></p>}<p>{card.detail}</p>{(card.type==="WALMART"||card.type==="WOOCOMMERCE"||card.type==="PINTEREST")&&<p><Link href="/diagnostics">View diagnostics →</Link></p>}</article>; })}</div></section>
    <section className="modules"><article className="module"><h3>Top Products · 7 days</h3>{topProducts.length?topProducts.map((item)=>{const p=productMap.get(item.productId);return <p key={item.productId}><strong>{p?.name??p?.sku??"Unknown product"}</strong><br/>{item._sum.units??0} units · {money(Number(item._sum.revenue??0))}</p>}):<p>No qualifying sales in this period.</p>}</article><article className="module"><h3>Channel Performance · 7 days</h3>{channelTotals.length?channelTotals.map((item)=><p key={item.channelId}><strong>{channelMap.get(item.channelId)?.name??"Unknown channel"}</strong><br/>{item._sum.units??0} units · {money(Number(item._sum.revenue??0))}</p>):<p>No qualifying sales in this period.</p>}</article>{sections.map(([title,description])=><article className="module" key={title}><h3>{title}</h3><p>{description}</p></article>)}</section>
  </main>;
}
