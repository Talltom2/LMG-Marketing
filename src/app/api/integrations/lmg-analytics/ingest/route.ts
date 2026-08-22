import { NextRequest, NextResponse } from "next/server";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireInternalSecret } from "@/lib/internal-auth";

type MetricInput = {
  date: string;
  sku?: string;
  source?: string;
  sessions?: number;
  productViews?: number;
  addToCarts?: number;
  checkoutStarts?: number;
  purchases?: number;
  revenue?: number;
};

const asInt = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
const asMoney = (value: unknown) => Math.max(0, Number(value) || 0);

function utcDay(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function normalizeSource(value: unknown) {
  const raw = String(value ?? "direct").trim().toLowerCase();
  if (!raw || raw === "(direct)" || raw === "none") return "direct";
  if (raw.includes("pinterest") || raw === "pin") return "pinterest";
  if (raw.includes("tiktok") || raw.includes("tik tok")) return "tiktok";
  if (raw.includes("instagram") || raw === "ig") return "instagram";
  if (raw.includes("facebook") || raw === "fb" || raw.includes("meta")) return "facebook";
  if (raw.includes("bing") || raw.includes("microsoft")) return "bing";
  if (raw.includes("google")) return "google";
  if (raw.includes("email") || raw.includes("newsletter") || raw.includes("mail")) return "email";
  if (raw.includes("organic")) return "organic";
  if (raw.includes("referral") || raw.includes("referrer")) return "referral";
  return raw.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "other";
}

export async function POST(request: NextRequest) {
  try {
    requireInternalSecret(request);
    const body = await request.json() as { metrics?: MetricInput[] };
    const metrics = Array.isArray(body.metrics) ? body.metrics : [];
    if (!metrics.length) return NextResponse.json({ error: "No metrics supplied" }, { status: 400 });

    const run = await db.syncRun.create({ data: { source: "lmg-analytics" } });

    try {
      const channel = await db.channel.upsert({
        where: { type_name: { type: ChannelType.WOOCOMMERCE, name: "Laughing Moose Gifts Website" } },
        create: { type: ChannelType.WOOCOMMERCE, name: "Laughing Moose Gifts Website", externalSource: "lmg-analytics", externalId: "website" },
        update: { active: true },
      });

      let saved = 0;
      for (const item of metrics) {
        const date = utcDay(item.date);
        const cleanSku = String(item.sku ?? "").trim();
        const trafficSource = normalizeSource(item.source);
        const product = cleanSku
          ? await db.product.upsert({
              where: { sku: cleanSku },
              create: { sku: cleanSku, name: cleanSku, active: true },
              update: { active: true },
            })
          : null;

        const metricSource = `lmg-analytics:${trafficSource}`;
        await db.funnelMetric.deleteMany({
          where: {
            date,
            source: metricSource,
            channelId: channel.id,
            productId: product?.id ?? null,
          },
        });

        await db.funnelMetric.create({
          data: {
            date,
            source: metricSource,
            channelId: channel.id,
            productId: product?.id ?? null,
            sessions: asInt(item.sessions),
            productViews: asInt(item.productViews),
            addToCarts: asInt(item.addToCarts),
            checkoutStarts: asInt(item.checkoutStarts),
            purchases: asInt(item.purchases),
            revenue: asMoney(item.revenue),
          },
        });
        saved += 1;
      }

      await db.syncRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), recordsRead: metrics.length, recordsSaved: saved },
      });

      return NextResponse.json({ ok: true, read: metrics.length, saved });
    } catch (error) {
      await db.syncRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message.slice(0, 2000) : "Unknown LMG Analytics ingest error",
        },
      });
      throw error;
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
