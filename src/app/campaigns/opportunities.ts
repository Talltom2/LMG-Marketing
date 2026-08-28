export type PromotionalOpportunity={
  id:string;label:string;description:string;audience:string;timingOffsetDays:number;paid?:boolean;recommendedFor?:string[];
};

export const opportunityCatalog:Record<string,PromotionalOpportunity[]>={
  WEBSITE_HOMEPAGE:[
    {id:"hero",label:"Homepage Hero Feature",description:"Primary homepage campaign placement with campaign headline, image and CTA.",audience:"All website visitors",timingOffsetDays:0,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","PROMOTIONAL_EVENT","EVERGREEN_SPOTLIGHT","COLLECTION_THEME","INVENTORY_CLEARANCE"]},
    {id:"supporting-module",label:"Supporting Homepage Module",description:"Secondary merchandising block that reinforces the campaign below the hero.",audience:"Homepage visitors",timingOffsetDays:0,recommendedFor:["COLLECTION_THEME","SEASONAL","EVERGREEN_SPOTLIGHT"]}
  ],
  WOOCOMMERCE:[
    {id:"landing-page",label:"Dedicated Campaign Landing Page",description:"Dedicated campaign story page with opportunity-specific lifestyle imagery, campaign messaging, featured products and calls to action.",audience:"Campaign traffic",timingOffsetDays:0,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","PROMOTIONAL_EVENT","COLLECTION_THEME","EVERGREEN_SPOTLIGHT"]},
    {id:"collection-page",label:"Campaign Collection Page",description:"Shoppable campaign collection page with its own product-forward lifestyle banner, campaign copy and selected product grid.",audience:"High-intent campaign shoppers",timingOffsetDays:0,recommendedFor:["COLLECTION_THEME","SEASONAL","INVENTORY_CLEARANCE","EVERGREEN_SPOTLIGHT"]},
    {id:"onsite-offer",label:"On-site Offer",description:"Present campaign-specific offer messaging in the store experience.",audience:"High-intent website visitors",timingOffsetDays:0,recommendedFor:["PROMOTIONAL_EVENT","INVENTORY_CLEARANCE","REENGAGEMENT"]}
  ],
  PINTEREST:[
    {id:"organic-product-pins",label:"Organic Product Pins",description:"Create finished 2:3 shoppable Pins with approved product/lifestyle imagery, optional on-image copy, Pin title and discovery description.",audience:"Pinterest discovery traffic",timingOffsetDays:-7,recommendedFor:["PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT","SEASONAL"]},
    {id:"seasonal-board",label:"Seasonal / Theme Board Push",description:"Build or refresh a campaign board and distribute multiple 2:3 Pins with coordinated visual copy, titles and descriptions.",audience:"Theme and seasonal browsers",timingOffsetDays:-14,recommendedFor:["SEASONAL","COLLECTION_THEME"]},
    {id:"inspiration-content",label:"Inspirational / Lifestyle Pins",description:"Create 2:3 lifestyle Pins using approved campaign imagery, concise image-overlay copy, a Pin title and discovery-focused description.",audience:"Upper-funnel inspiration seekers",timingOffsetDays:-10,recommendedFor:["SEASONAL","COLLECTION_THEME","PRODUCT_LAUNCH"]},
    {id:"paid-pinterest",label:"Paid Pinterest Campaign",description:"Adapt approved campaign Pins for paid distribution with final visual copy, Pin title, description, targeting and budget control.",audience:"Targeted prospecting or retargeting audience",timingOffsetDays:-7,paid:true,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","PROMOTIONAL_EVENT","EVERGREEN_SPOTLIGHT"]},
    {id:"retargeting",label:"Pinterest Retargeting",description:"Re-engage prior visitors or engagers with campaign-consistent Pin imagery and Pinterest-specific copy.",audience:"Warm visitors and engagers",timingOffsetDays:-2,paid:true,recommendedFor:["REENGAGEMENT","PROMOTIONAL_EVENT"]}
  ],
  TIKTOK:[
    {id:"organic-video",label:"Organic Short-form Video",description:"Create an organic campaign video for awareness and discovery.",audience:"TikTok organic audience",timingOffsetDays:-5,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","COLLECTION_THEME"]},
    {id:"product-showcase",label:"Product Showcase",description:"Demonstrate the hero product, features and use case in vertical video.",audience:"Product-curious viewers",timingOffsetDays:-4,recommendedFor:["EVERGREEN_SPOTLIGHT","PRODUCT_LAUNCH"]},
    {id:"shop-content",label:"TikTok Shop / Catalog Content",description:"Connect campaign creative directly to shoppable catalog products.",audience:"High-intent TikTok shoppers",timingOffsetDays:-3,recommendedFor:["PRODUCT_LAUNCH","PROMOTIONAL_EVENT","INVENTORY_CLEARANCE"]},
    {id:"paid-tiktok",label:"Paid TikTok Campaign",description:"Run campaign creative as paid media with an approved budget.",audience:"Targeted prospecting audience",timingOffsetDays:-4,paid:true,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","PROMOTIONAL_EVENT"]}
  ],
  META:[
    {id:"organic-social",label:"Organic Facebook / Instagram Posts",description:"Coordinated organic campaign posts across Meta properties.",audience:"Existing social followers",timingOffsetDays:-4,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","COLLECTION_THEME"]},
    {id:"reels-stories",label:"Reels / Stories",description:"Vertical campaign creative designed for short-form discovery placements.",audience:"Social discovery audience",timingOffsetDays:-5,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","EVERGREEN_SPOTLIGHT"]},
    {id:"catalog-ads",label:"Catalog / Product Ads",description:"Use product-feed creative to advertise selected campaign products.",audience:"Prospecting and warm shoppers",timingOffsetDays:-4,paid:true,recommendedFor:["PROMOTIONAL_EVENT","EVERGREEN_SPOTLIGHT","INVENTORY_CLEARANCE"]},
    {id:"retargeting",label:"Meta Retargeting",description:"Retarget website visitors and product viewers with campaign creative.",audience:"Warm website visitors",timingOffsetDays:-2,paid:true,recommendedFor:["REENGAGEMENT","PROMOTIONAL_EVENT"]}
  ],
  BING:[
    {id:"shopping",label:"Microsoft Shopping",description:"Promote campaign products through Microsoft Shopping placements.",audience:"High-intent product searchers",timingOffsetDays:-5,paid:true,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","EVERGREEN_SPOTLIGHT","PROMOTIONAL_EVENT"]},
    {id:"search",label:"Search Ads",description:"Capture campaign-related search demand with targeted keyword ads.",audience:"High-intent searchers",timingOffsetDays:-5,paid:true,recommendedFor:["PRODUCT_LAUNCH","PROMOTIONAL_EVENT","MARKETPLACE_GROWTH"]},
    {id:"audience",label:"Microsoft Audience Ads",description:"Extend campaign creative into Microsoft audience placements.",audience:"Prospecting audience",timingOffsetDays:-6,paid:true,recommendedFor:["SEASONAL","COLLECTION_THEME"]}
  ],
  WALMART_MARKETPLACE:[
    {id:"listing-merchandising",label:"Listing Merchandising",description:"Optimize campaign product presentation, content and offer readiness on Walmart.",audience:"Walmart shoppers",timingOffsetDays:-5,recommendedFor:["MARKETPLACE_GROWTH","PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT"]},
    {id:"price-promotion",label:"Marketplace Price / Promotion",description:"Use an approved promotional offer or price strategy on selected products.",audience:"Walmart deal shoppers",timingOffsetDays:0,recommendedFor:["PROMOTIONAL_EVENT","INVENTORY_CLEARANCE"]}
  ],
  WALMART_ADS:[
    {id:"sponsored-search",label:"Sponsored Search",description:"Use Walmart Connect sponsored placements for selected campaign products.",audience:"High-intent Walmart shoppers",timingOffsetDays:-4,paid:true,recommendedFor:["MARKETPLACE_GROWTH","PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT"]},
    {id:"retargeting",label:"Walmart Retargeting / Display",description:"Re-engage Walmart audiences where supported by the account and campaign type.",audience:"Warm Walmart audiences",timingOffsetDays:-2,paid:true,recommendedFor:["MARKETPLACE_GROWTH","PROMOTIONAL_EVENT"]}
  ],
  AMAZON_US:[
    {id:"listing-merchandising",label:"Amazon US Listing Merchandising",description:"Optimize campaign product merchandising and offer presentation on Amazon US.",audience:"Amazon US shoppers",timingOffsetDays:-5,recommendedFor:["MARKETPLACE_GROWTH","PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT"]},
    {id:"promotion",label:"Amazon US Promotion",description:"Apply campaign promotion strategy to selected Amazon US products when available.",audience:"Amazon deal shoppers",timingOffsetDays:0,recommendedFor:["PROMOTIONAL_EVENT","INVENTORY_CLEARANCE"]}
  ],
  AMAZON_ADS:[
    {id:"sponsored-products",label:"Sponsored Products",description:"Advertise selected campaign products in Amazon search and product placements.",audience:"High-intent Amazon shoppers",timingOffsetDays:-4,paid:true,recommendedFor:["MARKETPLACE_GROWTH","PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT"]},
    {id:"sponsored-brands",label:"Sponsored Brands",description:"Promote a themed product set or collection where account eligibility permits.",audience:"Amazon category shoppers",timingOffsetDays:-5,paid:true,recommendedFor:["COLLECTION_THEME","PRODUCT_LAUNCH"]}
  ],
  AMAZON_CA:[
    {id:"listing-merchandising",label:"Amazon Canada Listing Merchandising",description:"Optimize campaign product merchandising for Amazon Canada.",audience:"Amazon Canada shoppers",timingOffsetDays:-5,recommendedFor:["MARKETPLACE_GROWTH","PRODUCT_LAUNCH"]},
    {id:"promotion",label:"Amazon Canada Promotion",description:"Use an approved promotional offer on selected Amazon Canada products when available.",audience:"Amazon Canada deal shoppers",timingOffsetDays:0,recommendedFor:["PROMOTIONAL_EVENT","INVENTORY_CLEARANCE"]}
  ],
  EMAIL:[
    {id:"full-list",label:"Full Customer Newsletter",description:"Send the core campaign to the eligible customer list.",audience:"Eligible subscribers",timingOffsetDays:0,recommendedFor:["PRODUCT_LAUNCH","SEASONAL","PROMOTIONAL_EVENT","COLLECTION_THEME"]},
    {id:"previous-buyers",label:"Previous Buyers",description:"Target customers who have already purchased from Laughing Moose Gifts.",audience:"Existing customers",timingOffsetDays:0,recommendedFor:["REENGAGEMENT","SEASONAL","EVERGREEN_SPOTLIGHT"]},
    {id:"category-buyers",label:"Category / Product Buyers",description:"Target prior buyers of the promoted category or related products.",audience:"High-affinity previous buyers",timingOffsetDays:0,recommendedFor:["EVERGREEN_SPOTLIGHT","COLLECTION_THEME","SEASONAL"]},
    {id:"lapsed-customers",label:"Lapsed Customer Win-back",description:"Re-engage customers who have not purchased recently.",audience:"Lapsed customers",timingOffsetDays:-1,recommendedFor:["REENGAGEMENT"]},
    {id:"abandoned-cart",label:"Abandoned Cart Follow-up",description:"Use the campaign offer/message in cart-recovery follow-up where appropriate.",audience:"Cart abandoners",timingOffsetDays:1,recommendedFor:["PROMOTIONAL_EVENT","REENGAGEMENT"]},
    {id:"new-subscribers",label:"New Subscriber Campaign",description:"Introduce new subscribers to the campaign products or collection.",audience:"Recent subscribers",timingOffsetDays:0,recommendedFor:["PRODUCT_LAUNCH","EVERGREEN_SPOTLIGHT"]}
  ]
};

const OPPORTUNITY_SELECTION_PREFIX="lmg-opportunity-selections-v1:";
function persistedOpportunitySelection(channel:string){
  if(typeof window==="undefined")return undefined;
  try{
    const campaignId=localStorage.getItem("lmg-active-campaign-id");
    if(!campaignId)return undefined;
    const raw=localStorage.getItem(`${OPPORTUNITY_SELECTION_PREFIX}${campaignId}`);
    if(!raw)return undefined;
    const saved=JSON.parse(raw) as Record<string,string[]>;
    return Object.prototype.hasOwnProperty.call(saved,channel)?saved[channel]:undefined;
  }catch{return undefined;}
}

export function recommendedOpportunityIdsFor(channel:string,templateId:string){
  const persisted=persistedOpportunitySelection(channel);
  if(persisted!==undefined)return persisted;
  const options=opportunityCatalog[channel]??[];
  const recommended=options.filter(o=>o.recommendedFor?.includes(templateId)).map(o=>o.id);
  return recommended.length?recommended:[options[0]?.id].filter(Boolean) as string[];
}
export function opportunityFor(channel:string,id:string){return (opportunityCatalog[channel]??[]).find(o=>o.id===id)}
