import Link from "next/link";
import { db } from "@/lib/db";
import LmgTopNav from "@/components/LmgTopNav";

const sections = [
  ["Product Intelligence", "Find high-conversion products that need traffic and high-traffic products that need corrective action."],
  ["Channel Intelligence", "Compare WooCommerce, marketplaces, Pinterest, email, social, search and referral performance."],
  ["Campaign Builder", "Select products and promotional tools, use a recommended calendar, create creative, schedule execution and measure results."],
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
  const priorStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [metrics, priorMetrics, topProducts, channelTotals, allChannels, campaigns, syncRuns] = await Promise.all([
    db.commerceMetric.findMany({ where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, select: { units: true, revenue: true } }),
    db.commerceMetric.findMany({ where: { date: { gte: priorStart, lt: startDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, select: { units: true, revenue: true } }),
    db.commerceMetric.groupBy({ by: ["productId"], where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, _sum: { units: true, revenue: true }, orderBy: { _sum: { revenue: "desc" } }, take: 5 }),
    db.commerceMetric.groupBy({ by: ["channelId"], where: { date: { gte: startDate, lte: endDate }, OR: [{ units: { gt: 0 } }, { revenue: { gt: 0 } }] }, _sum: { units: true, revenue: true }, orderBy: { _sum: { revenue: "desc" } } }),
    db.channel.findMany({ select: { id: true, type: true, name: true, active: true } }),
    db.campaign.findMany({ where: { status: { in: ["PLANNED", "ACTIVE", "PAUSED"] } }, select: { id: true, name: true, status: true, startDate: true, endDate: true }, orderBy: { startDate: "asc" }, take: 10 }),
    db.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 12 }),
  ]);

  const revenue = metrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);
  const units = metrics.reduce((sum, metric) => sum + metric.units, 0);
  const priorRevenue = priorMetrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);
  const revenueChange = priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : null;
  const averageOrder = units > 0 ? revenue / units : 0;

  const productIds = topProducts.map((item) => item.productId);
  const channelIds = channelTotals.map((item) => item.channelId);
  const [products, channels] = await Promise.all([
    db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true, name: true } }),
    db.channel.findMany({ where: { id: { in: channelIds } }, select: { id: true, name: true, type: true } }),
  ]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]));
  const channelTotalsMap = new Map(channelTotals.map((item) => [item.channelId, item]));
  const connectedCount = allChannels.filter(c => c.active).length;
  const failedSyncs = syncRuns.filter(s => s.status === "FAILED").length;
  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;
  const plannedCampaigns = campaigns.filter(c => c.status === "PLANNED").length;
  const topChannel = channelTotals[0] ? channelMap.get(channelTotals[0].channelId)?.name : undefined;
  const topProduct = topProducts[0] ? productMap.get(topProducts[0].productId)?.name : undefined;

  const strengths = [
    revenue > 0 ? `${money(revenue)} revenue and ${units} units recorded in the last 7 days.` : "Core commerce telemetry is connected and ready to measure live activity.",
    topProduct ? `${topProduct} is currently the strongest product by 7-day revenue.` : "Product-level intelligence is available for campaign selection.",
    topChannel ? `${topChannel} is currently the strongest attributed sales channel.` : `${connectedCount} marketing/data channels are active in the intelligence database.`,
  ];
  const weaknesses = [
    revenueChange !== null && revenueChange < 0 ? `Revenue is down ${Math.abs(revenueChange).toFixed(0)}% versus the prior 7-day period.` : "Several channels still lack complete native performance telemetry.",
    failedSyncs > 0 ? `${failedSyncs} recent data synchronization run${failedSyncs === 1 ? "" : "s"} failed and should be reviewed.` : "Full-funnel attribution is still incomplete on channels whose API connections are unfinished.",
    "Creative production and external execution remain dependent on completing channel connectors.",
  ];
  const opportunities = [
    plannedCampaigns > 0 ? `${plannedCampaigns} planned campaign${plannedCampaigns === 1 ? " is" : "s are"} available to activate and optimize.` : "Use Campaign Opportunity Intelligence to fill open promotional windows.",
    topProduct ? `Build the next campaign around proven demand for ${topProduct} and related products.` : "Use product signals to identify a hero product or collection for the next campaign.",
    "Use closeout learning to repeat winning product/channel combinations instead of rebuilding campaigns from scratch.",
  ];
  const threats = [
    failedSyncs > 0 ? "Failed integrations can hide problems or create misleading campaign decisions until repaired." : "Incomplete platform connections can delay execution or leave blind spots in attribution.",
    activeCampaigns > 1 ? `${activeCampaigns} campaigns are active simultaneously; watch for channel, budget, or message conflicts.` : "Paid-media underperformance can consume authorized budget quickly without alert thresholds and optimization.",
    "Marketplace or advertising-platform policy changes can interrupt publication, catalog visibility, or campaign delivery.",
  ];

  const scorecards = [
    { label: "Revenue", value: money(revenue), note: "Sellerchamp · last 7 days" },
    { label: "Units", value: String(units), note: "Sellerchamp · last 7 days" },
    { label: "Active Campaigns", value: String(activeCampaigns), note: `${plannedCampaigns} planned` },
    { label: "Connected Channels", value: String(connectedCount), note: "Intelligence database" },
    { label: "Avg. Revenue / Unit", value: money(averageOrder), note: "Calculated" },
  ];

  return <main><LmgTopNav active="/"/>
    <header className="home-hero"><p className="eyebrow">Laughing Moose Gifts</p><h1>Marketing Intelligence</h1><p className="subtitle">Data → Observation → Diagnosis → Recommendation → Decision → Action → Result → Learning</p></header>

    <section className="swot-panel"><div className="swot-heading"><div><p className="eyebrow">At-a-glance intelligence</p><h2>Strengths · Weaknesses · Opportunities · Threats</h2></div><Link href="/campaigns/alerts">Open Alerts & Exceptions →</Link></div><div className="swot-grid">{[["Strengths",strengths,"strength"],["Weaknesses",weaknesses,"weakness"],["Opportunities",opportunities,"opportunity"],["Threats",threats,"threat"]].map(([title,items,tone])=><article className={`swot-card ${tone}`} key={String(title)}><h3>{title}</h3>{(items as string[]).map((item,i)=><p key={i}>{item}</p>)}</article>)}</div></section>

    <section className="scorecards">{scorecards.map(card=><article className="card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>

    <section className="panel"><div><p className="eyebrow">Command Center</p><h2>What needs attention?</h2></div><div className="empty-state">{revenue > 0 ? <><strong>Commerce data is live.</strong><p>{money(revenue)} in revenue and {units} units are recorded for the last seven days. Campaign diagnostics, alerts, and closeout learning now provide the management layer around those results.</p></> : <><strong>No current-period commerce activity yet.</strong><p>Sellerchamp is connected; the dashboard will populate as qualifying sales are synchronized.</p></>}</div></section>

    <section className="panel"><div><p className="eyebrow">Channel Command Center</p><h2>LMG marketing ecosystem</h2><p>Each channel becomes a health card as its native telemetry is connected.</p></div><div className="modules">{channelCards.map(card=>{const matchingChannels=allChannels.filter(channel=>channel.type===card.type);const liveTotals=matchingChannels.reduce((acc,channel)=>{const totals=channelTotalsMap.get(channel.id);return{units:acc.units+(totals?._sum.units??0),revenue:acc.revenue+Number(totals?._sum.revenue??0)}},{units:0,revenue:0});const connected=matchingChannels.some(channel=>channel.active);const status=liveTotals.revenue>0||liveTotals.units>0?"LIVE":connected?"CONNECTED":card.phase.toUpperCase();return <article className="module" key={card.type}><p className="eyebrow">{status}</p><h3>{card.label}</h3>{liveTotals.revenue>0||liveTotals.units>0?<p><strong>{money(liveTotals.revenue)}</strong><br/>{liveTotals.units} units · last 7 days</p>:<p><strong>{card.phase}</strong></p>}<p>{card.detail}</p>{(card.type==="WALMART"||card.type==="WOOCOMMERCE"||card.type==="PINTEREST")&&<p><Link href="/diagnostics">View diagnostics →</Link></p>}</article>})}</div></section>

    <section className="modules"><article className="module"><h3>Top Products · 7 days</h3>{topProducts.length?topProducts.map(item=>{const product=productMap.get(item.productId);return <p key={item.productId}><strong>{product?.name??product?.sku??"Unknown product"}</strong><br/>{item._sum.units??0} units · {money(Number(item._sum.revenue??0))}</p>}):<p>No qualifying sales in this period.</p>}</article><article className="module"><h3>Channel Performance · 7 days</h3>{channelTotals.length?channelTotals.map(item=><p key={item.channelId}><strong>{channelMap.get(item.channelId)?.name??"Unknown channel"}</strong><br/>{item._sum.units??0} units · {money(Number(item._sum.revenue??0))}</p>):<p>No qualifying sales in this period.</p>}</article>{sections.slice(2).map(([title,description])=><article className="module" key={title}><h3>{title}</h3><p>{description}</p>{title==="Campaign Builder"&&<p><Link href="/campaigns">Build a campaign →</Link></p>}</article>)}</section>
  </main>;
}
