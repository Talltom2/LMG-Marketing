import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";
import { SellerchampClient, type SellerchampMarketplaceAccount, type SellerchampOrder } from "./client";

type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord =>
  value && typeof value === "object" ? (value as AnyRecord) : {};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const numberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const day = (value: unknown): Date => {
  const parsed = text(value) ? new Date(String(value)) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Date(Date.UTC(safe.getUTCFullYear(), safe.getUTCMonth(), safe.getUTCDate()));
};

function channelType(account: SellerchampMarketplaceAccount): ChannelType {
  const raw = `${account.marketplace_account_type ?? ""} ${account.type ?? ""} ${account.name ?? ""}`.toLowerCase();
  if (raw.includes("walmart")) return ChannelType.WALMART;
  if (raw.includes("amazon") && raw.includes("canada")) return ChannelType.AMAZON_CA;
  if (raw.includes("amazon") || raw.includes("amzn")) return ChannelType.AMAZON_US;
  if (raw.includes("woocommerce") || raw.includes("website") || raw.includes("woo")) return ChannelType.WOOCOMMERCE;
  return ChannelType.OTHER;
}

function itemSku(item: AnyRecord): string | undefined {
  return text(item.sku) ?? text(item.merchant_sku) ?? text(item.seller_sku) ?? text(item.alt_sku) ?? text(item.product_sku);
}

function itemQuantity(item: AnyRecord): number {
  return Math.max(0, numberValue(item.quantity ?? item.qty ?? item.quantity_sold ?? item.units, 1));
}

function itemRevenue(item: AnyRecord, quantity: number): number {
  const lineTotal = numberValue(item.total ?? item.line_total ?? item.item_total ?? item.total_price, Number.NaN);
  if (Number.isFinite(lineTotal)) return lineTotal;
  const unit = numberValue(item.price ?? item.unit_price ?? item.sale_price ?? item.item_price, 0);
  return unit * quantity;
}

async function upsertChannels(accounts: SellerchampMarketplaceAccount[]) {
  const map = new Map<string, string>();

  for (const account of accounts) {
    const externalId = String(account.id);
    const channel = await db.channel.upsert({
      where: { externalSource_externalId: { externalSource: "sellerchamp", externalId } },
      create: {
        type: channelType(account),
        name: account.name ?? account.marketplace_account_type ?? `Sellerchamp ${externalId}`,
        externalSource: "sellerchamp",
        externalId,
      },
      update: {
        type: channelType(account),
        name: account.name ?? account.marketplace_account_type ?? `Sellerchamp ${externalId}`,
        active: true,
      },
    });
    map.set(externalId, channel.id);
  }

  return map;
}

async function syncProducts(client: SellerchampClient) {
  let page = 1;
  let read = 0;
  let saved = 0;

  while (true) {
    const response = await client.getProducts({ page, pageSize: 250 });
    const products = response.products ?? [];
    read += products.length;

    for (const source of products) {
      const sku = text(source.sku) ?? text(source.alt_sku);
      if (!sku) continue;
      await db.product.upsert({
        where: { sku },
        create: { sku, name: source.title ?? sku },
        update: { name: source.title ?? sku, active: true },
      });
      saved += 1;
    }

    if (products.length < 250) break;
    page += 1;
  }

  return { read, saved };
}

function orderItems(order: SellerchampOrder): AnyRecord[] {
  const candidates = order.order_items ?? order.items ?? order.line_items;
  return Array.isArray(candidates) ? candidates.map(asRecord) : [];
}

export async function syncSellerchamp(startDate: Date, endDate: Date) {
  const run = await db.syncRun.create({ data: { source: "sellerchamp" } });
  const client = new SellerchampClient();

  try {
    const accountResponse = await client.getMarketplaceAccounts();
    const accounts = accountResponse.marketplace_accounts ?? [];
    const channelIds = await upsertChannels(accounts);
    const productStats = await syncProducts(client);

    const aggregates = new Map<string, { date: Date; sku: string; channelId: string; units: number; revenue: number }>();
    let page = 1;
    let ordersRead = 0;

    while (true) {
      const response = await client.getOrders({
        page,
        pageSize: 250,
        updatedAtStart: startDate.toISOString(),
        updatedAtEnd: endDate.toISOString(),
      });
      const orders = response.orders ?? [];
      ordersRead += orders.length;

      for (const order of orders) {
        const accountId = text(order.marketplace_account_id) ?? text(asRecord(order).marketplace_id);
        const channelId = accountId ? channelIds.get(accountId) : undefined;
        if (!channelId) continue;

        for (const item of orderItems(order)) {
          const sku = itemSku(item);
          if (!sku) continue;
          const quantity = itemQuantity(item);
          const revenue = itemRevenue(item, quantity);
          if (quantity <= 0 && revenue <= 0) continue;

          const date = day(order.purchased_at ?? order.created_at);
          const key = `${date.toISOString()}|${sku}|${channelId}`;
          const existing = aggregates.get(key) ?? { date, sku, channelId, units: 0, revenue: 0 };
          existing.units += quantity;
          existing.revenue += revenue;
          aggregates.set(key, existing);
        }
      }

      if (orders.length < 250) break;
      page += 1;
    }

    let metricsSaved = 0;
    for (const aggregate of aggregates.values()) {
      const product = await db.product.upsert({
        where: { sku: aggregate.sku },
        create: { sku: aggregate.sku, name: aggregate.sku },
        update: { active: true },
      });
      await db.commerceMetric.upsert({
        where: {
          date_productId_channelId_source: {
            date: aggregate.date,
            productId: product.id,
            channelId: aggregate.channelId,
            source: "sellerchamp",
          },
        },
        create: {
          date: aggregate.date,
          productId: product.id,
          channelId: aggregate.channelId,
          units: Math.round(aggregate.units),
          revenue: aggregate.revenue,
          source: "sellerchamp",
        },
        update: {
          units: Math.round(aggregate.units),
          revenue: aggregate.revenue,
        },
      });
      metricsSaved += 1;
    }

    const recordsRead = productStats.read + ordersRead;
    const recordsSaved = productStats.saved + metricsSaved;
    await db.syncRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: new Date(), recordsRead, recordsSaved },
    });

    return { accounts: accounts.length, products: productStats, ordersRead, metricsSaved, recordsRead, recordsSaved };
  } catch (error) {
    await db.syncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Unknown sync error",
      },
    });
    throw error;
  }
}
