import { CampaignStatus, ChannelType, RecommendationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWebsiteProductHealth } from "@/lib/integrations/woocommerce/product-health";

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

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
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
    const body: Record<string, unknown> = await request.json();
    const name = String(body.name || "").trim();
    const objective = String(body.objective || "").trim();
    const productSkus: string[] = Array.isArray(body.productSkus) ? body.productSkus.map((value) => String(value).trim()).filter(Boolean) : [];
    const requestedChannels: string[] = Array.isArray(body.channels) ? body.channels.map((value) => String(value)) : [];
    const startDate = new Date(String(body.startDate || ""));
    const endDate = new Date(String(body.endDate || ""));

    if (!name || !productSkus.length || !requestedChannels.length || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Name, dates, at least one product and at least one channel are required." }, { status: 400 });
    }

    let products = await db.product.findMany({ where: { sku: { in: productSkus }, active: true } });
    const existingSkus = new Set(products.map((product) => product.sku));
    const missingSkus = productSkus.filter((sku) => !existingSkus.has(sku));

    if (missingSkus.length) {
      const website = await getWebsiteProductHealth();
      const catalogBySku = new Map(
        website.products
          .filter((product) => String(product.sku ?? "").trim())
          .map((product) => [String(product.sku).trim(), product]),
      );

      for (const sku of missingSkus) {
        const catalogProduct = catalogBySku.get(sku);
        if (!catalogProduct) continue;
        await db.product.upsert({
          where: { sku },
          update: { name: catalogProduct.name, active: true },
          create: { sku, name: catalogProduct.name, active: true },
        });
      }

      products = await db.product.findMany({ where: { sku: { in: productSkus }, active: true } });
    }

    if (!products.length) {
      return NextResponse.json({ error: "None of the selected products could be resolved in WooCommerce or the intelligence database." }, { status: 400 });
    }

    const validTypes = requestedChannels.filter((value: string): value is ChannelType => Object.values(ChannelType).includes(value as ChannelType));
    const channels = await db.channel.findMany({ where: { type: { in: validTypes }, active: true } });
    const channelByType = new Map(channels.map((channel) => [channel.type, channel]));
    const productIds = products.map((product) => product.id);

    const reusableCandidates = await db.campaign.findMany({
      where: {
        name,
        startDate,
        endDate,
        status: { in: [CampaignStatus.DRAFT, CampaignStatus.PLANNED] },
      },
      include: { products: true },
    });
    const reusableCampaign = reusableCandidates.find((candidate) => sameIds(candidate.products.map((row) => row.productId), productIds));

    const result = await db.$transaction(async (tx) => {
      const campaign = reusableCampaign
        ? await tx.campaign.update({
            where: { id: reusableCampaign.id },
            data: {
              objective: objective || null,
              status: CampaignStatus.PLANNED,
              channelId: validTypes.length === 1 ? channelByType.get(validTypes[0])?.id ?? null : null,
            },
          })
        : await tx.campaign.create({
            data: {
              name,
              objective: objective || null,
              startDate,
              endDate,
              status: CampaignStatus.PLANNED,
              channelId: validTypes.length === 1 ? channelByType.get(validTypes[0])?.id ?? null : null,
              products: {
                create: products.map((product, index) => ({ productId: product.id, role: index === 0 ? "HERO" : "SUPPORT" })),
              },
            },
          });

      if (reusableCampaign) {
        await tx.recommendation.deleteMany({ where: { campaignId: campaign.id } });
      }

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

    return NextResponse.json({ campaign: result, reusedExistingInstance: Boolean(reusableCampaign) }, { status: reusableCampaign ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create campaign" }, { status: 500 });
  }
}
