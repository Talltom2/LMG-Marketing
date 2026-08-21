import { db } from "@/lib/db";

export type ProductIntelligence = {
  sku: string;
  name: string;
  units: number;
  commerceRevenue: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  websitePurchases: number;
  websiteRevenue: number;
  viewToCartRate: number;
  purchaseConversionRate: number;
  signal: "PROMOTE" | "FIX_CONVERSION" | "WATCH" | "INSUFFICIENT_DATA";
};

const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export async function getProductIntelligence(startDate: Date, endDate: Date): Promise<ProductIntelligence[]> {
  const products = await db.product.findMany({
    where: { active: true },
    include: {
      commerceMetrics: { where: { date: { gte: startDate, lte: endDate } } },
      funnelMetrics: { where: { date: { gte: startDate, lte: endDate } } },
    },
    orderBy: { name: "asc" },
  });

  const rows = products.map((product) => {
    const units = product.commerceMetrics.reduce((sum, metric) => sum + metric.units, 0);
    const commerceRevenue = product.commerceMetrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);
    const productViews = product.funnelMetrics.reduce((sum, metric) => sum + metric.productViews, 0);
    const addToCarts = product.funnelMetrics.reduce((sum, metric) => sum + metric.addToCarts, 0);
    const checkoutStarts = product.funnelMetrics.reduce((sum, metric) => sum + metric.checkoutStarts, 0);
    const websitePurchases = product.funnelMetrics.reduce((sum, metric) => sum + metric.purchases, 0);
    const websiteRevenue = product.funnelMetrics.reduce((sum, metric) => sum + Number(metric.revenue), 0);

    return {
      sku: product.sku,
      name: product.name,
      units,
      commerceRevenue,
      productViews,
      addToCarts,
      checkoutStarts,
      websitePurchases,
      websiteRevenue,
      viewToCartRate: ratio(addToCarts, productViews),
      purchaseConversionRate: ratio(websitePurchases, productViews),
      signal: "INSUFFICIENT_DATA" as ProductIntelligence["signal"],
    };
  });

  const measured = rows.filter((row) => row.productViews >= 10);
  const averageViews = measured.length ? measured.reduce((sum, row) => sum + row.productViews, 0) / measured.length : 0;
  const averageConversion = measured.length
    ? measured.reduce((sum, row) => sum + row.purchaseConversionRate, 0) / measured.length
    : 0;

  return rows
    .map((row) => {
      if (row.productViews < 10) return row;
      if (row.purchaseConversionRate >= Math.max(averageConversion * 1.25, 0.02) && row.productViews < averageViews) {
        return { ...row, signal: "PROMOTE" as const };
      }
      if (row.productViews >= averageViews && row.purchaseConversionRate < averageConversion * 0.75) {
        return { ...row, signal: "FIX_CONVERSION" as const };
      }
      return { ...row, signal: "WATCH" as const };
    })
    .sort((a, b) => b.commerceRevenue - a.commerceRevenue || b.productViews - a.productViews);
}
