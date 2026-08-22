import { db } from "@/lib/db";

export type DiagnosticSeverity = "CRITICAL" | "WARNING" | "WATCH" | "HEALTHY" | "DATA_GAP";
export type DiagnosticLayer =
  | "CATALOG_HEALTH"
  | "VISIBILITY"
  | "TRAFFIC"
  | "OFFER"
  | "CONVERSION"
  | "CREATIVE"
  | "CHANNEL_COMPARISON"
  | "HISTORICAL_COMPARISON"
  | "EXTERNAL_DEMAND";

export type DiagnosticFinding = {
  scope: "CHANNEL" | "CAMPAIGN";
  channelId: string;
  channelName: string;
  layer: DiagnosticLayer;
  severity: DiagnosticSeverity;
  title: string;
  observation: string;
  likelyCause: string;
  confidence: number;
  recommendation: string;
  currentValue?: number;
  expectedValue?: number;
  deltaPct?: number;
};

export type DiagnosticChannelSummary = {
  channelId: string;
  channelName: string;
  currentRevenue: number;
  baselineRevenue: number;
  revenueDeltaPct: number | null;
  currentUnits: number;
  baselineUnits: number;
  unitDeltaPct: number | null;
  currentSessions: number;
  baselineSessions: number;
  currentPurchases: number;
  baselinePurchases: number;
  conversionRate: number | null;
  baselineConversionRate: number | null;
  health: DiagnosticSeverity;
};

export type DiagnosticReport = {
  generatedAt: Date;
  currentStart: Date;
  currentEnd: Date;
  baselineStart: Date;
  baselineEnd: Date;
  channels: DiagnosticChannelSummary[];
  findings: DiagnosticFinding[];
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const delta = (current: number, baseline: number) =>
  baseline > 0 ? (current - baseline) / baseline : current > 0 ? 1 : null;

function severityForDrop(value: number | null): DiagnosticSeverity {
  if (value == null) return "DATA_GAP";
  if (value <= -0.5) return "CRITICAL";
  if (value <= -0.25) return "WARNING";
  if (value <= -0.1) return "WATCH";
  return "HEALTHY";
}

export async function runDiagnosticEngine(days = 7): Promise<DiagnosticReport> {
  const currentEnd = new Date();
  const currentStart = new Date(currentEnd.getTime() - days * 86400000);
  const baselineEnd = new Date(currentStart.getTime() - 1);
  const baselineStart = new Date(baselineEnd.getTime() - days * 86400000);

  const channels = await db.channel.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [currentCommerce, baselineCommerce, currentFunnel, baselineFunnel] = await Promise.all([
    db.commerceMetric.groupBy({
      by: ["channelId"],
      where: { date: { gte: currentStart, lte: currentEnd } },
      _sum: { revenue: true, units: true },
    }),
    db.commerceMetric.groupBy({
      by: ["channelId"],
      where: { date: { gte: baselineStart, lte: baselineEnd } },
      _sum: { revenue: true, units: true },
    }),
    db.funnelMetric.groupBy({
      by: ["channelId"],
      where: { date: { gte: currentStart, lte: currentEnd }, channelId: { not: null } },
      _sum: { sessions: true, purchases: true, productViews: true },
    }),
    db.funnelMetric.groupBy({
      by: ["channelId"],
      where: { date: { gte: baselineStart, lte: baselineEnd }, channelId: { not: null } },
      _sum: { sessions: true, purchases: true, productViews: true },
    }),
  ]);

  const commerceMap = new Map(currentCommerce.map((r) => [r.channelId, r]));
  const baselineCommerceMap = new Map(baselineCommerce.map((r) => [r.channelId, r]));
  const funnelMap = new Map(currentFunnel.filter((r) => r.channelId).map((r) => [r.channelId as string, r]));
  const baselineFunnelMap = new Map(baselineFunnel.filter((r) => r.channelId).map((r) => [r.channelId as string, r]));

  const summaries: DiagnosticChannelSummary[] = channels.map((channel) => {
    const cc = commerceMap.get(channel.id);
    const bc = baselineCommerceMap.get(channel.id);
    const cf = funnelMap.get(channel.id);
    const bf = baselineFunnelMap.get(channel.id);

    const currentRevenue = Number(cc?._sum.revenue ?? 0);
    const baselineRevenue = Number(bc?._sum.revenue ?? 0);
    const currentUnits = cc?._sum.units ?? 0;
    const baselineUnits = bc?._sum.units ?? 0;
    const currentSessions = cf?._sum.sessions ?? 0;
    const baselineSessions = bf?._sum.sessions ?? 0;
    const currentPurchases = cf?._sum.purchases ?? 0;
    const baselinePurchases = bf?._sum.purchases ?? 0;
    const revenueDeltaPct = delta(currentRevenue, baselineRevenue);
    const unitDeltaPct = delta(currentUnits, baselineUnits);
    const conversionRate = ratio(currentPurchases, currentSessions);
    const baselineConversionRate = ratio(baselinePurchases, baselineSessions);

    return {
      channelId: channel.id,
      channelName: channel.name,
      currentRevenue,
      baselineRevenue,
      revenueDeltaPct,
      currentUnits,
      baselineUnits,
      unitDeltaPct,
      currentSessions,
      baselineSessions,
      currentPurchases,
      baselinePurchases,
      conversionRate,
      baselineConversionRate,
      health: severityForDrop(revenueDeltaPct),
    };
  });

  const findings: DiagnosticFinding[] = [];

  for (const channel of summaries) {
    const revenueSeverity = severityForDrop(channel.revenueDeltaPct);
    if (channel.baselineRevenue > 0 && channel.revenueDeltaPct != null && channel.revenueDeltaPct <= -0.1) {
      const sessionDelta = delta(channel.currentSessions, channel.baselineSessions);
      const conversionDelta =
        channel.conversionRate != null && channel.baselineConversionRate != null && channel.baselineConversionRate > 0
          ? (channel.conversionRate - channel.baselineConversionRate) / channel.baselineConversionRate
          : null;

      let likelyCause = "Sales are below the recent historical baseline.";
      let recommendation = "Review the channel from catalog health through conversion and compare affected products against the prior period.";
      let layer: DiagnosticLayer = "HISTORICAL_COMPARISON";
      let confidence = 0.65;

      if (sessionDelta != null && sessionDelta <= -0.2) {
        layer = "TRAFFIC";
        likelyCause = "Traffic or marketplace visibility has fallen materially, suggesting customers are seeing fewer LMG offers.";
        recommendation = "Audit published/suppressed listings, inventory, search exposure, Buy Box/offer status, and marketplace traffic by SKU.";
        confidence = 0.82;
      } else if (conversionDelta != null && conversionDelta <= -0.2) {
        layer = "CONVERSION";
        likelyCause = "Traffic is comparatively intact but conversion has deteriorated, pointing toward offer, price, shipping, content, or competitive issues.";
        recommendation = "Compare price, shipping promise, fulfillment method, Buy Box status, product content and competitor offers for the highest-loss SKUs.";
        confidence = 0.84;
      }

      findings.push({
        scope: "CHANNEL",
        channelId: channel.channelId,
        channelName: channel.channelName,
        layer,
        severity: revenueSeverity,
        title: `${channel.channelName} revenue is below expected`,
        observation: `Revenue is ${(Math.abs(channel.revenueDeltaPct) * 100).toFixed(0)}% below the preceding ${days}-day baseline.`,
        likelyCause,
        confidence,
        recommendation,
        currentValue: channel.currentRevenue,
        expectedValue: channel.baselineRevenue,
        deltaPct: channel.revenueDeltaPct,
      });
    }

    if (channel.currentRevenue > 0 && channel.currentSessions === 0) {
      findings.push({
        scope: "CHANNEL",
        channelId: channel.channelId,
        channelName: channel.channelName,
        layer: "VISIBILITY",
        severity: "DATA_GAP",
        title: `${channel.channelName} lacks visibility/traffic telemetry`,
        observation: "Commerce data is present, but channel-level traffic data is not available to distinguish visibility loss from conversion loss.",
        likelyCause: "The channel adapter is not yet supplying impressions, sessions/search exposure, or equivalent marketplace traffic metrics.",
        confidence: 0.98,
        recommendation: "Connect channel traffic/visibility metrics so future diagnoses can determine whether shoppers are not seeing products or are seeing them and not buying.",
      });
    }
  }

  findings.push(...channels.flatMap((channel) => {
    const existing = findings.some((f) => f.channelId === channel.id && f.layer === "CATALOG_HEALTH");
    if (existing) return [];
    return [{
      scope: "CHANNEL" as const,
      channelId: channel.id,
      channelName: channel.name,
      layer: "CATALOG_HEALTH" as const,
      severity: "DATA_GAP" as const,
      title: `${channel.name} catalog-health checks need adapter data`,
      observation: "Published/suppressed status, inventory state, fulfillment method, category/product type, and Buy Box/offer status are not yet normalized into the diagnostic dataset.",
      likelyCause: "Catalog-state telemetry has not yet been ingested for this channel.",
      confidence: 0.99,
      recommendation: "Add catalog-health ingestion to the channel adapter; this is the first diagnostic layer to evaluate before attributing a sales decline to demand or creative.",
    }];
  }));

  const severityRank: Record<DiagnosticSeverity, number> = { CRITICAL: 5, WARNING: 4, WATCH: 3, DATA_GAP: 2, HEALTHY: 1 };
  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence);

  return {
    generatedAt: new Date(),
    currentStart,
    currentEnd,
    baselineStart,
    baselineEnd,
    channels: summaries,
    findings,
  };
}
