import { NextRequest, NextResponse } from "next/server";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireInternalSecret } from "@/lib/internal-auth";

type MetricInput = {
  date: string;
  sku?: string;
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
        const product = cleanSku
          ? await db.product.upsert({
              where: { sku: cleanSku },
              create: { sku: cleanSku, name: cleanSku, active: true },
              update: { active: true },
            })
          : null;

        await db.funnelMetric.deleteMany({
          where: {
            date,
            source: "lmg-analytics",
            channelId: channel.id,
            productId: product?.id ?? null,
          },
        });

        await db.funnelMetric.create({
          data: {
            date,
            source: "lmg-analytics",
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
