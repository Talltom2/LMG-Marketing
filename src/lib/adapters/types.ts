export type ProductCommerceRecord = {
  date: string;
  sku: string;
  channel: string;
  units: number;
  revenue: number;
  inventory?: number | null;
};

export type FunnelRecord = {
  date: string;
  sku?: string | null;
  sourceChannel?: string | null;
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  revenue: number;
};

export interface CommerceAdapter {
  name: string;
  fetchProductPerformance(startDate: Date, endDate: Date): Promise<ProductCommerceRecord[]>;
}

export interface FunnelAdapter {
  name: string;
  fetchFunnelPerformance(startDate: Date, endDate: Date): Promise<FunnelRecord[]>;
}
