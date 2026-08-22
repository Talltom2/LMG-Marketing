import { walmartRequest } from "./client";

type AnyObj = Record<string, any>;
type Health = "GREEN" | "YELLOW" | "RED";

const num = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") return num(v.amount ?? v.value ?? v.quantity ?? v.availToSellQty ?? v.availableToSellQty);
  return null;
};

const status = (i: AnyObj) => String(i?.publishedStatus?.status ?? i?.publishedStatus ?? i?.publishStatus ?? i?.lifecycleStatus ?? i?.status ?? "UNKNOWN").toUpperCase();

async function allItems() {
  const out: AnyObj[] = [];
  for (let offset = 0; offset < 10000; offset += 50) {
    const r = await walmartRequest<any>(`/v3/items?limit=50&offset=${offset}`);
    const rows = Array.isArray(r?.ItemResponse) ? r.ItemResponse : [];
    out.push(...rows);
    const total = Number(r?.totalItems ?? 0);
    if (rows.length < 50 || (total && out.length >= total)) break;
  }
  return out;
}

async function allInventories() {
  const out: AnyObj[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page++) {
    const requestPath: string = cursor
      ? `/v3/inventories?limit=50&nextCursor=${encodeURIComponent(cursor)}`
      : "/v3/inventories?limit=50";
    const r = await walmartRequest<any>(requestPath).catch(() => null);
    if (!r) break;
    const rows = Array.isArray(r?.elements) ? r.elements : Array.isArray(r?.inventory) ? r.inventory : Array.isArray(r?.inventories) ? r.inventories : [];
    out.push(...rows);
    const next: unknown = r?.nextCursor ?? r?.meta?.nextCursor;
    if (!next || !rows.length || String(next) === cursor) break;
    cursor = String(next);
  }
  return out;
}

function inventoryQty(row: AnyObj): number {
  const direct = num(row?.quantity ?? row?.availableToSellQty ?? row?.availToSellQty ?? row?.inventoryCount);
  if (direct != null) return direct;
  const nodes = row?.shipNodes ?? row?.nodes ?? row?.inventory ?? row?.inventories;
  if (Array.isArray(nodes)) return nodes.reduce((sum: number, node: AnyObj) => sum + (num(node?.availToSellQty ?? node?.availableToSellQty ?? node?.quantity ?? node?.amount) ?? 0), 0);
  return 0;
}

async function pricing() {
  const out: AnyObj[] = [];
  for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
    const r = await walmartRequest<any>("/v3/price/getPricingInsights", {
      method: "POST",
      body: JSON.stringify({ pageNumber }),
    }).catch(() => null);
    const data = r?.data ?? r;
    const rows = Array.isArray(data?.pricingInsightsResponseList) ? data.pricingInsightsResponseList : [];
    if (!rows.length) break;
    out.push(...rows);
    const pages = data?.pageContext?.totalPages;
    if (typeof pages === "number" && pageNumber + 1 >= pages) break;
    if (rows.length < 20 && !data?.pageContext) break;
  }
  return out;
}

export async function getWalmartActiveProductHealth() {
  const [items, offers, inventories] = await Promise.all([allItems(), pricing(), allInventories()]);
  const offerMap = new Map(offers.map((o) => [String(o.sku ?? o.SKU ?? "").toUpperCase(), o]));
  const inventoryMap = new Map<string, number>();
  for (const row of inventories) {
    const sku = String(row?.sku ?? row?.SKU ?? row?.itemSku ?? "").toUpperCase();
    if (!sku) continue;
    inventoryMap.set(sku, (inventoryMap.get(sku) ?? 0) + inventoryQty(row));
  }
  const rank: Record<Health, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

  return items
    .filter((i) => {
      const s = status(i);
      return s.includes("PUBLISH") && !s.includes("UNPUBLISHED");
    })
    .map((i) => {
      const sku = String(i.sku ?? "");
      const o = offerMap.get(sku.toUpperCase());
      const inventory = inventoryMap.has(sku.toUpperCase()) ? inventoryMap.get(sku.toUpperCase())! : null;
      const buyBox = num(o?.buyBoxWinRate);
      const traffic = o?.traffic ? String(o.traffic).toUpperCase() : null;
      const competitive = o?.priceCompetitive == null ? null : Boolean(o.priceCompetitive);
      const productType = String(i.productType ?? i.productTypeName ?? i.category ?? "") || null;
      const name = String(o?.itemName ?? i.productName ?? i.itemName ?? sku);
      let health: Health = "GREEN";
      const reasons: string[] = [];

      if (inventory === 0) {
        health = "RED";
        reasons.push("Out of stock");
      } else if (inventory != null && inventory <= 3) {
        health = "YELLOW";
        reasons.push(`Low inventory (${inventory})`);
      }
      if (buyBox != null && buyBox < 10) {
        health = "RED";
        reasons.push("Buy Box <10%");
      } else if (buyBox != null && buyBox < 50) {
        if (health !== "RED") health = "YELLOW";
        reasons.push("Buy Box <50%");
      }
      if (competitive === false) {
        if (health !== "RED") health = "YELLOW";
        reasons.push("Price uncompetitive");
      }
      if (traffic === "LOW" || traffic === "VERY_LOW") {
        if (health !== "RED") health = "YELLOW";
        reasons.push(`${traffic.replace("_", " ")} traffic`);
      }
      if (!o) {
        if (health !== "RED") health = "YELLOW";
        reasons.push("Offer telemetry incomplete");
      }

      return { sku, name, productType, health, inventory, buyBoxWinRate: buyBox, traffic, priceCompetitive: competitive, reasons };
    })
    .sort((a, b) => rank[a.health] - rank[b.health] || a.name.localeCompare(b.name));
}
