export const campaignChannels = {
  WOOCOMMERCE: {
    label: "WooCommerce / WordPress",
    execution: "EXECUTABLE",
    deliverables: ["Homepage feature", "Dedicated landing page", "Campaign collection page"],
  },
  PINTEREST: {
    label: "Pinterest",
    execution: "EXECUTABLE_WHEN_CONNECTED",
    deliverables: ["Organic product Pin", "Seasonal board Pin", "Pin title and description"],
  },
  EMAIL: {label:"Email",execution:"MANUAL",deliverables:["Subject and preheader", "Email body", "CTA"]},
  META: {label:"Facebook / Instagram",execution:"MANUAL",deliverables:["Feed post", "Story or Reel brief", "CTA"]},
  TIKTOK: {label:"TikTok",execution:"MANUAL",deliverables:["Video brief", "Caption", "CTA"]},
  BING: {label:"Bing / Microsoft Ads",execution:"MANUAL",deliverables:["Headlines", "Descriptions", "Destination URL"]},
  WALMART: {label:"Walmart Marketplace",execution:"MANUAL",deliverables:["Merchandising task", "Offer note", "Tracking note"]},
  AMAZON_US: {label:"Amazon US",execution:"MANUAL",deliverables:["Merchandising task", "Promotion copy", "Tracking note"]},
  AMAZON_CA: {label:"Amazon Canada",execution:"MANUAL",deliverables:["Merchandising task", "Promotion copy", "Tracking note"]},
} as const;

export type CampaignChannelCode=keyof typeof campaignChannels;

export function channelDeliverables(codes:string[]){
 return Object.fromEntries(codes.map(code=>[code,(campaignChannels as Record<string,{readonly deliverables:readonly string[]}>)[code]?.deliverables??["Manual scheduled task"]]));
}
