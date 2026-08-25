import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Conn = { state: "READY" | "CONNECTED_DATA_ONLY" | "CONNECTION_REQUIRED"; note: string };

type AssetSpec = { format: string; deliverables: string[]; paid: boolean };

const specs: Record<string, AssetSpec> = {
  "Website Homepage": {
    format: "Responsive homepage hero + supporting module",
    deliverables: ["Desktop hero", "Mobile hero", "Headline", "CTA", "Supporting module copy"],
    paid: false,
  },
  WooCommerce: {
    format: "Responsive store merchandising",
    deliverables: ["Landing-page copy", "Product tiles", "Offer callout", "CTA"],
    paid: false,
  },
  Pinterest: { format: "1000×1500 Pin", deliverables: ["Pin image", "Pin title", "Description", "Destination URL", "UTM tags"], paid: true },
  TikTok: { format: "1080×1920 vertical", deliverables: ["Video concept", "Hook", "Shot list", "Caption", "CTA"], paid: true },
  "Facebook / Instagram": { format: "1080×1350 feed + 1080×1920 story/reel", deliverables: ["Feed creative", "Story/Reel creative", "Primary text", "Headline", "CTA"], paid: true },
  "Bing / Microsoft Ads": { format: "Responsive search / shopping", deliverables: ["Headlines", "Descriptions", "Keywords/audience", "Destination URL", "UTM tags"], paid: true },
  "Walmart Marketplace": { format: "Marketplace merchandising", deliverables: ["Listing promotion copy", "Image guidance", "Offer copy"], paid: false },
  "Walmart Connect Ads": { format: "Walmart Connect", deliverables: ["Sponsored-ad copy", "Product set", "Bid/budget brief"], paid: true },
  "Amazon US Marketplace": { format: "Marketplace merchandising", deliverables: ["Promotion copy", "Merchandising brief", "Product set"], paid: false },
  "Amazon Ads": { format: "Amazon Sponsored Ads", deliverables: ["Sponsored-product brief", "Product targets", "Budget brief"], paid: true },
  "Amazon Canada Marketplace": { format: "Marketplace merchandising", deliverables: ["Promotion copy", "Merchandising brief", "Product set"], paid: false },
  Email: { format: "Responsive email", deliverables: ["Subject", "Preheader", "Hero", "Body copy", "CTA", "Product block copy"], paid: false },
};

const wooOpportunitySpecs: Record<string, AssetSpec> = {
  "Dedicated Campaign Landing Page": {
    format: "Responsive WordPress campaign story page",
    deliverables: ["Unique lifestyle hero", "Campaign headline", "Campaign story copy", "Featured product block", "Primary CTA", "Destination URL"],
    paid: false,
  },
  "Campaign Collection Page": {
    format: "Responsive shoppable WooCommerce collection page",
    deliverables: ["Unique product-forward lifestyle banner", "Collection headline", "Collection intro copy", "Selected product grid", "Shop CTA", "Destination URL"],
    paid: false,
  },
};

function connection(channel: string): Conn {
  const env = process.env;
  if (channel === "Pinterest") return env.PINTEREST_ACCESS_TOKEN ? { state: "CONNECTED_DATA_ONLY", note: "Pinterest credentials detected; publishing adapter still needs final API execution wiring." } : { state: "CONNECTION_REQUIRED", note: "Pinterest access token required." };
  if (channel === "TikTok") return env.TIKTOK_ACCESS_TOKEN ? { state: "CONNECTED_DATA_ONLY", note: "TikTok credentials detected; publishing adapter still needs final execution wiring." } : { state: "CONNECTION_REQUIRED", note: "TikTok credentials required." };
  if (channel.includes("Walmart")) return env.WALMART_CLIENT_ID && env.WALMART_CLIENT_SECRET ? { state: "CONNECTED_DATA_ONLY", note: "Walmart Marketplace credentials detected; campaign publishing adapter pending." } : { state: "CONNECTION_REQUIRED", note: "Walmart campaign credentials required." };
  if (channel.includes("WooCommerce") || channel === "Website Homepage") {
    const commerceReady = Boolean(env.WOOCOMMERCE_CONSUMER_KEY && env.WOOCOMMERCE_CONSUMER_SECRET);
    const wordpressReady = Boolean(env.WORDPRESS_USERNAME && env.WORDPRESS_APPLICATION_PASSWORD);
    if (commerceReady && wordpressReady) return { state: "READY", note: "WooCommerce and WordPress publishing credentials detected. This asset can be executed by the website publishing adapter." };
    if (commerceReady) return { state: "CONNECTED_DATA_ONLY", note: "WooCommerce catalog credentials detected; WordPress publishing credentials are still required for page creation." };
    return { state: "CONNECTION_REQUIRED", note: "WooCommerce/WordPress campaign credentials required." };
  }
  if (channel === "Email") return { state: "CONNECTION_REQUIRED", note: "Email platform connection required." };
  return { state: "CONNECTION_REQUIRED", note: `${channel} execution connection has not been completed yet.` };
}

function channelFromTitle(title: string) {
  if (title.startsWith("WooCommerce · ")) return "WooCommerce";
  return title.replace(/ campaign plan$/i, "");
}

function opportunityFromTitle(title: string) {
  if (!title.startsWith("WooCommerce · ")) return null;
  return title.slice("WooCommerce · ".length).trim();
}

function isProductionRecommendation(title: string) {
  return title.endsWith("campaign plan") || title.startsWith("WooCommerce · ");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      products: { include: { product: true } },
      recommendations: { include: { actions: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const assets = campaign.recommendations.filter((r) => isProductionRecommendation(r.title)).map((r) => {
    const channel = channelFromTitle(r.title);
    const opportunity = opportunityFromTitle(r.title);
    const draft = r.actions.find((a) => a.actionType === "CREATIVE_DRAFT");
    const approval = r.actions.find((a) => a.actionType === "CREATIVE_APPROVED");
    const schedule = r.actions.find((a) => a.actionType === "SCHEDULE_EXECUTION");
    const publish = r.actions.find((a) => a.actionType === "PUBLISH_EXECUTION");
    const image = r.actions.find((a) => a.actionType === "AI_LIFESTYLE_IMAGE");
    const conn = connection(channel);
    const spec = (opportunity && wooOpportunitySpecs[opportunity]) || specs[channel] || { format: "Channel-ready creative package", deliverables: ["Creative", "Copy", "CTA", "Tracking"], paid: false };
    let status = "DRAFT_READY";
    if (approval) status = "APPROVED";
    if (schedule?.completed) status = "SCHEDULED";
    if (publish?.completed) status = "PUBLISHED";
    else if (approval && conn.state !== "READY") status = "READY_CONNECTION_REQUIRED";

    return {
      recommendationId: r.id,
      channel,
      opportunity,
      title: opportunity ? `WooCommerce · ${opportunity}` : `${channel} production package`,
      status,
      creative: draft?.description ?? "Creative brief not generated.",
      imagePrompt: image?.description ?? null,
      imageResult: image?.resultSummary ?? null,
      format: spec.format,
      deliverables: spec.deliverables,
      paid: spec.paid,
      connection: conn,
      approvedAt: approval?.createdAt ?? null,
      scheduledFor: schedule?.executionTarget ?? null,
      publishedAt: publish?.completedAt ?? null,
      result: publish?.resultSummary ?? null,
    };
  });

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      status: campaign.status,
      products: campaign.products.map((x) => ({ sku: x.product.sku, name: x.product.name, role: x.role })),
    },
    assets,
    summary: {
      total: assets.length,
      approved: assets.filter((a) => ["APPROVED", "READY_CONNECTION_REQUIRED", "SCHEDULED", "PUBLISHED"].includes(a.status)).length,
      scheduled: assets.filter((a) => a.status === "SCHEDULED").length,
      published: assets.filter((a) => a.status === "PUBLISHED").length,
      needsConnection: assets.filter((a) => a.status === "READY_CONNECTION_REQUIRED").length,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const recommendationId = String(b.recommendationId || "");
  const operation = String(b.operation || "");
  const rec = await db.recommendation.findFirst({ where: { id: recommendationId, campaignId: id }, include: { actions: true } });
  if (!rec) return NextResponse.json({ error: "Campaign creative not found" }, { status: 404 });

  if (operation === "APPROVE") {
    const existing = rec.actions.find((a) => a.actionType === "CREATIVE_APPROVED");
    if (!existing) await db.action.create({ data: { recommendationId, actionType: "CREATIVE_APPROVED", description: String(b.creative || rec.actions.find((a) => a.actionType === "CREATIVE_DRAFT")?.description || "Approved campaign creative"), executionTarget: String(b.budget ?? "") } });
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  if (operation === "SCHEDULE") {
    const when = String(b.scheduledFor || "");
    if (!when) return NextResponse.json({ error: "Schedule date/time required" }, { status: 400 });
    const action = rec.actions.find((a) => a.actionType === "SCHEDULE_EXECUTION");
    if (action) await db.action.update({ where: { id: action.id }, data: { executionTarget: when, completed: true, completedAt: new Date(), resultSummary: "Authorized asset scheduled in LMG Marketing execution queue." } });
    else await db.action.create({ data: { recommendationId, actionType: "SCHEDULE_EXECUTION", description: "Schedule approved campaign creative.", executionTarget: when, completed: true, completedAt: new Date(), resultSummary: "Authorized asset scheduled in LMG Marketing execution queue." } });
    return NextResponse.json({ ok: true, status: "SCHEDULED" });
  }

  if (operation === "MARK_PUBLISHED") {
    const channel = channelFromTitle(rec.title);
    const conn = connection(channel);
    const existing = rec.actions.find((a) => a.actionType === "PUBLISH_EXECUTION");
    if (existing) await db.action.update({ where: { id: existing.id }, data: { completed: true, completedAt: new Date(), resultSummary: String(b.result || `Publication recorded for ${channel}.`) } });
    else await db.action.create({ data: { recommendationId, actionType: "PUBLISH_EXECUTION", description: `Publish approved ${channel} campaign asset.`, executionTarget: channel, completed: true, completedAt: new Date(), resultSummary: String(b.result || `Publication recorded for ${channel}.`) } });
    return NextResponse.json({ ok: true, status: "PUBLISHED", connection: conn });
  }

  return NextResponse.json({ error: "Unsupported production operation" }, { status: 400 });
}
