import type { WalmartDiagnosticSnapshot } from "./diagnostics";

export type WalmartNativeSeverity = "CRITICAL" | "WARNING" | "WATCH" | "HEALTHY";
export type WalmartNativeFinding = { layer: string; severity: WalmartNativeSeverity; title: string; observation: string; likelyCause: string; confidence: number; recommendation: string; autoFixKind: string };

export function evaluateWalmartSnapshot(s: WalmartDiagnosticSnapshot) {
  const findings: WalmartNativeFinding[] = [];
  const catalogIssueRate = s.catalog.total ? (s.catalog.unpublished + s.catalog.systemProblem) / s.catalog.total : 0;
  const oosRate = s.inventory.totalSkus ? s.inventory.outOfStock / s.inventory.totalSkus : 0;
  const buyBoxLossRate = s.offer.total ? s.offer.losingBuyBox / s.offer.total : 0;
  const lowTrafficRate = s.offer.total ? (s.visibility.veryLow + s.visibility.low) / s.offer.total : 0;

  if (s.catalog.systemProblem > 0 || catalogIssueRate >= 0.1) findings.push({ layer:"CATALOG_HEALTH", severity: catalogIssueRate >= .25 || s.catalog.systemProblem >= 5 ? "CRITICAL" : "WARNING", title:"Walmart catalog has non-published or system-problem items", observation:`${s.catalog.unpublished} unpublished/staged and ${s.catalog.systemProblem} system-problem items out of ${s.catalog.total} catalog items.`, likelyCause:"Walmart item validation, required attributes, product type/category, compliance, feed processing, or catalog-state issues are preventing normal publication.", confidence:.96, recommendation:"Review affected SKUs, item status/errors and required attributes; correct only validated catalog defects, then resubmit and verify publication.", autoFixKind:"CATALOG_REPAIR" });

  if (s.inventory.outOfStock > 0 || s.inventory.lowStock > 0) findings.push({ layer:"INVENTORY", severity:oosRate >= .2 ? "CRITICAL" : oosRate >= .05 ? "WARNING" : "WATCH", title:"Walmart inventory is limiting sellable assortment", observation:`${s.inventory.outOfStock} SKUs are out of stock and ${s.inventory.lowStock} are at 3 units or fewer across ${s.inventory.totalSkus} inventory records.`, likelyCause:"Available-to-sell inventory is insufficient on part of the Walmart assortment, which can directly reduce transactability, search exposure and sales.", confidence:.98, recommendation:"Reconcile Walmart inventory against Sellerchamp/physical stock and WFS; replenish or correct quantities only after confirming the authoritative inventory source.", autoFixKind:"INVENTORY_RECONCILE" });

  if (s.offer.losingBuyBox > 0 || s.offer.uncompetitive > 0) findings.push({ layer:"OFFER", severity:buyBoxLossRate >= .5 ? "CRITICAL" : buyBoxLossRate >= .2 ? "WARNING" : "WATCH", title:"Walmart offer competitiveness needs attention", observation:`${s.offer.losingBuyBox} offers have Buy Box win rate below 50%; ${s.offer.uncompetitive} are flagged as price-uncompetitive. Average Buy Box win rate: ${s.offer.avgBuyBoxWinRate == null ? "unavailable" : s.offer.avgBuyBoxWinRate.toFixed(1)+"%"}.`, likelyCause:"Price, delivered price, fulfillment promise, inventory availability, or competing offers are reducing Buy Box participation/wins.", confidence:.9, recommendation:"Compare current price, Buy Box price, competitor price, shipping promise and fulfillment by affected SKU. Never lower prices automatically without an approved floor/margin rule.", autoFixKind:"OFFER_REVIEW" });

  if (s.visibility.veryLow + s.visibility.low > 0) findings.push({ layer:"VISIBILITY", severity:lowTrafficRate >= .5 ? "WARNING" : "WATCH", title:"Walmart traffic is weak on part of the catalog", observation:`${s.visibility.veryLow} items are VERY_LOW traffic and ${s.visibility.low} are LOW traffic in Pricing Insights.`, likelyCause:"Weak search exposure may be associated with catalog quality, availability, competitiveness, demand, keyword relevance, or ranking.", confidence:.8, recommendation:"Prioritize low-traffic SKUs with inventory and competitive offers; then use Search Insights/listing-quality recommendations to improve discoverability rather than changing content blindly.", autoFixKind:"VISIBILITY_OPTIMIZE" });

  if (s.demand.inDemand > 0) findings.push({ layer:"DEMAND", severity:"HEALTHY", title:"Walmart identifies in-demand products", observation:`${s.demand.inDemand} pricing-insight items are flagged in demand; observed 30-day GMV is $${s.demand.gmv30.toFixed(2)} where provided.`, likelyCause:"Walmart demand signals indicate active customer opportunity.", confidence:.85, recommendation:"Protect inventory, Buy Box competitiveness and content quality on in-demand products before allocating effort to weaker items.", autoFixKind:"NONE" });

  const rank: Record<WalmartNativeSeverity,number> = { CRITICAL:4, WARNING:3, WATCH:2, HEALTHY:1 };
  const health = findings.reduce<WalmartNativeSeverity>((worst,f)=>rank[f.severity]>rank[worst]?f.severity:worst,"HEALTHY");
  return { health, findings, rates: { catalogIssueRate, oosRate, buyBoxLossRate, lowTrafficRate } };
}
