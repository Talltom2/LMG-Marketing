import { ChannelType, RecommendationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const channelOffsets: Partial<Record<ChannelType, number>> = {
  EMAIL: 0,
  PINTEREST: -7,
  TIKTOK: -3,
  META: -3,
  BING: -5,
  GOOGLE: -5,
  WALMART: -2,
  WOOCOMMERCE: 0,
  AMAZON_US: -2,
  AMAZON_CA: -2,
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function creativeFor(channel: string, names: string[], objective?: string) {
  const hero = names.slice(0, 3).join(", ");
  const goal = objective || "drive qualified traffic and profitable sales";
  return `Feature ${hero}. Message: warm, useful country-home inspiration with a clear reason to shop now. Goal: ${goal}. Adapt headline, body copy and CTA to ${channel}.`;
}

export async function GET() {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      products: { include: { product: { select: { sku: true, name: true } } } },
      recommendations: {
        orderBy: { priority: "asc" },
        include: { actions: true },
      },
    },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const objective = String(body.objective || "").trim();
    const productSkus = Array.isArray(body.productSkus) ? body.productSkus.map(String) : [];
    const requestedChannels = Array.isArray(body.channels) ? body.channels.map(String) : [];
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (!name || !productSkus.length || !requestedChannels.length || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Name, dates, at least one product and at least one channel are required." }, { status: 400 });
    }

    const products = await db.product.findMany({ where: { sku: { in: productSkus }, active: true } });
    const validTypes = requestedChannels.filter((value): value is ChannelType => Object.values(ChannelType).includes(value as ChannelType));
    const channels = await db.channel.findMany({ where: { type: { in: validTypes }, active: true } });
    const channelByType = new Map(channels.map((channel) => [channel.type, channel]));

    const result = await db.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          name,
          objective: objective || null,
          startDate,
          endDate,
          status: "PLANNED",
          channelId: validTypes.length === 1 ? channelByType.get(validTypes[0])?.id ?? null : null,
          products: {
            create: products.map((product, index) => ({ productId: product.id, role: index === 0 ? "HERO" : "SUPPORT" })),
          },
        },
      });

      for (const type of validTypes) {
        const recommendedDate = addDays(startDate, channelOffsets[type] ?? -2);
        const channelName = channelByType.get(type)?.name ?? type.replaceAll("_", " ");
        const creative = creativeFor(channelName, products.map((product) => product.name), objective);

        await tx.recommendation.create({
          data: {
            campaignId: campaign.id,
            title: `${channelName} campaign plan`,
            observation: `${products.length} selected product${products.length === 1 ? "" : "s"} are assigned to ${channelName}.`,
            recommendation: `Launch the ${channelName} promotion on ${recommendedDate.toLocaleDateString("en-US")} and measure against the pre-campaign baseline.`,
            rationale: "Timing is staggered so discovery channels can seed demand before the primary selling window.",
            expectedImpact: objective || "Increase qualified traffic, conversion and attributable revenue.",
            status: RecommendationStatus.APPROVED,
            priority: 2,
            actions: {
              create: [
                { actionType: "CALENDAR", description: `Recommended ${channelName} launch`, executionTarget: recommendedDate.toISOString() },
                { actionType: "CREATIVE_DRAFT", description: creative, executionTarget: channelName },
                { actionType: "SCHEDULE_EXECUTION", description: `Schedule approved ${channelName} creative and promotion. Human approval required before external publish/spend.`, executionTarget: channelName },
                { actionType: "METRICS_REVIEW", description: "Collect impressions/traffic, clicks, conversion, orders, units and revenue; compare expected vs actual and feed findings to diagnostics.", executionTarget: channelName },
              ],
            },
          },
        });
      }

      return tx.campaign.findUnique({
        where: { id: campaign.id },
        include: { products: { include: { product: true } }, recommendations: { include: { actions: true } } },
      });
    });

    return NextResponse.json({ campaign: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create campaign" }, { status: 500 });
  }
}
