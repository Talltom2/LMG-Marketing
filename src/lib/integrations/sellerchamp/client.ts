const DEFAULT_BASE_URL = "https://app.sellerchamp.com";

export type SellerchampMarketplaceAccount = {
  id: string;
  name?: string;
  type?: string;
  marketplace_account_type?: string;
};

export type SellerchampOrder = {
  id?: string;
  order_number?: string;
  purchased_at?: string;
  created_at?: string;
  updated_at?: string;
  order_status?: string;
  marketplace_account_id?: string;
  total_amount?: number;
  total_tax?: number;
  total_shipping?: number;
  quantity_sold?: number;
  order_items?: unknown[];
  [key: string]: unknown;
};

export type SellerchampProduct = {
  id: string;
  marketplace_account_id?: string;
  sku?: string;
  alt_sku?: string;
  title?: string;
  quantity_available?: number;
  quantity_listed?: number;
  retail_price?: number;
  [key: string]: unknown;
};

type QueryValue = string | number | boolean | undefined;

export class SellerchampClient {
  constructor(
    private readonly token = process.env.SELLERCHAMP_API_TOKEN,
    private readonly baseUrl = process.env.SELLERCHAMP_API_BASE_URL || DEFAULT_BASE_URL,
  ) {
    if (!token) throw new Error("SELLERCHAMP_API_TOKEN is not configured");
  }

  private async get<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      headers: { token: this.token as string, accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sellerchamp ${response.status}: ${body.slice(0, 500)}`);
    }

    return response.json() as Promise<T>;
  }

  async getMarketplaceAccounts() {
    return this.get<{ marketplace_accounts: SellerchampMarketplaceAccount[] }>("/api/marketplace_accounts");
  }

  async getOrders(params: {
    page?: number;
    pageSize?: number;
    updatedAtStart?: string;
    updatedAtEnd?: string;
    marketplaceAccountId?: string;
  } = {}) {
    return this.get<{ orders: SellerchampOrder[] }>("/api/orders", {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 250,
      updated_at_start: params.updatedAtStart,
      updated_at_end: params.updatedAtEnd,
      marketplace_account_id: params.marketplaceAccountId,
    });
  }

  async getProducts(params: {
    page?: number;
    pageSize?: number;
    marketplaceAccountId?: string;
    updatedAtStart?: string;
    updatedAtEnd?: string;
  } = {}) {
    return this.get<{ products: SellerchampProduct[] }>("/api/products.json", {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 250,
      marketplace_account_id: params.marketplaceAccountId,
      updated_at_start: params.updatedAtStart,
      updated_at_end: params.updatedAtEnd,
    });
  }
}
