export type PacketProduct = {
  sku: string;
  name: string;
  description?: string | null;
  price?: number | null;
  inventory?: number | null;
  url?: string | null;
  images?: string[];
  role?: string | null;
  historical?: Record<string, number>;
};

export type CampaignBriefInput = {
  id: string;
  name: string;
  objective?: string | null;
  offer?: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  channels: string[];
  deliverables: Record<string, readonly string[]>;
  products: PacketProduct[];
  campaignHistory: unknown[];
  previousLearnings: string[];
};

export type PerformancePacketInput = {
  campaign: Record<string, unknown>;
  summary: Record<string, number>;
  baseline: Record<string, number>;
  channels: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  dataHealth: Array<Record<string, unknown>>;
  factualAnomalies: Array<Record<string, unknown>>;
  priorActions: Array<Record<string, unknown>>;
};

const money = (value: number | null | undefined) => value == null ? "not available" : `$${value.toFixed(2)}`;
const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

export function buildCampaignBrief(input: CampaignBriefInput) {
  const markdown = [
    `# ChatGPT Campaign Brief: ${input.name}`,
    "",
    `- Campaign ID: ${input.id}`,
    `- Objective: ${text(input.objective) || "Not specified"}`,
    `- Offer: ${text(input.offer) || "Not specified"}`,
    `- Schedule: ${input.startDate.slice(0, 10)} through ${input.endDate.slice(0, 10)}`,
    `- Budget: ${money(input.budget)}`,
    `- Channels: ${input.channels.join(", ") || "None selected"}`,
    "",
    "## Required deliverables",
    ...input.channels.flatMap(channel => [`### ${channel}`, ...(input.deliverables[channel] ?? ["Manual campaign task"]).map(item => `- ${item}`)]),
    "",
    "## Selected products",
    ...input.products.flatMap(product => [
      `### ${product.name} (${product.sku})`,
      `- Role: ${product.role ?? "PRODUCT"}`,
      `- Description: ${text(product.description) || "Not available"}`,
      `- Price: ${money(product.price)}`,
      `- Inventory: ${product.inventory ?? "not available"}`,
      `- URL: ${product.url ?? "not available"}`,
      `- Images: ${product.images?.join(", ") || "not available"}`,
      `- Historical performance: ${JSON.stringify(product.historical ?? {})}`,
    ]),
    "",
    "## Historical campaign performance",
    "```json",
    JSON.stringify(input.campaignHistory, null, 2),
    "```",
    "",
    "## Relevant previous learnings",
    ...(input.previousLearnings.length ? input.previousLearnings.map(item => `- ${item}`) : ["- No recorded closeout learnings yet."]),
    "",
    "## Instructions for ChatGPT",
    "Create the requested channel deliverables. Keep factual product details unchanged. Return content grouped by channel and deliverable, including headline, body copy, CTA, destination URL, image direction/reference, notes, and tracking parameters. LMG Marketing will import, review, and approve every asset before scheduling.",
  ].join("\n");
  return { markdown, json: input };
}

export function buildPerformancePacket(input: PerformancePacketInput) {
  const campaignName = text(input.campaign.name) || "Campaign";
  const markdown = [
    `# ChatGPT Performance Packet: ${campaignName}`,
    "",
    "## Campaign",
    "```json",
    JSON.stringify(input.campaign, null, 2),
    "```",
    "",
    "## Actual performance",
    "```json",
    JSON.stringify(input.summary, null, 2),
    "```",
    "",
    "## Pre-campaign baseline",
    "```json",
    JSON.stringify(input.baseline, null, 2),
    "```",
    "",
    "## Attribution by channel",
    "```json",
    JSON.stringify(input.channels, null, 2),
    "```",
    "",
    "## Product performance",
    "```json",
    JSON.stringify(input.products, null, 2),
    "```",
    "",
    "## Objective data-health findings",
    ...input.dataHealth.map(item => `- ${text(item.title)}: ${text(item.detail ?? item.observation)}`),
    "",
    "## Factual anomalies",
    ...input.factualAnomalies.map(item => `- ${text(item.title)}: ${text(item.evidence)}`),
    "",
    "## Prior actions and results",
    "```json",
    JSON.stringify(input.priorActions, null, 2),
    "```",
    "",
    "## Instructions for ChatGPT",
    "Interpret the measurements, separate facts from hypotheses, recommend prioritized follow-up actions, and state what evidence would confirm or reject each hypothesis. Do not assume any action has been executed.",
  ].join("\n");
  return { markdown, json: input };
}
