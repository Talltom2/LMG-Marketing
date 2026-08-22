export type Health="GREEN"|"YELLOW"|"RED";
export type TikTokFinding={layer:string;severity:"CRITICAL"|"WARNING"|"WATCH"|"HEALTHY";title:string;observation:string;likelyCause:string;recommendation:string;confidence:number};
const configured=(name:string)=>Boolean(process.env[name]);
export async function getTikTokConfigHealth(){
 const checks=[
  {key:"access",label:"TikTok API authorization",health:configured("TIKTOK_ACCESS_TOKEN")?"GREEN":"RED",value:configured("TIKTOK_ACCESS_TOKEN")?"Configured":"Not configured",detail:"Required for live TikTok diagnostics and account actions."},
  {key:"advertiser",label:"Ads account",health:configured("TIKTOK_ADVERTISER_ID")?"GREEN":"YELLOW",value:configured("TIKTOK_ADVERTISER_ID")?"Configured":"Not configured",detail:"Needed for campaign, spend and ads diagnostics."},
  {key:"pixel",label:"TikTok Pixel",health:configured("TIKTOK_PIXEL_ID")?"GREEN":"YELLOW",value:configured("TIKTOK_PIXEL_ID")?"Configured":"Not configured",detail:"Needed to connect TikTok traffic to website behavior and conversions."},
  {key:"events",label:"Events API",health:configured("TIKTOK_EVENTS_ACCESS_TOKEN")?"GREEN":"YELLOW",value:configured("TIKTOK_EVENTS_ACCESS_TOKEN")?"Configured":"Not configured",detail:"Server-side conversion telemetry improves resilience and attribution."},
  {key:"catalog",label:"Catalog",health:configured("TIKTOK_CATALOG_ID")?"GREEN":"YELLOW",value:configured("TIKTOK_CATALOG_ID")?"Configured":"Not configured",detail:"Needed for catalog/product synchronization diagnostics."},
  {key:"shop",label:"TikTok Shop",health:configured("TIKTOK_SHOP_ID")?"GREEN":"YELLOW",value:configured("TIKTOK_SHOP_ID")?"Configured":"Not configured",detail:"Optional until TikTok Shop is connected; tracked separately from ads/catalog readiness."},
 ] as Array<{key:string;label:string;health:Health;value:string;detail:string}>;
 const findings:TikTokFinding[]=[];
 for(const c of checks){if(c.health==="GREEN")continue;findings.push({layer:c.key==="access"?"CONFIGURATION":c.key==="pixel"||c.key==="events"?"CONVERSION":c.key==="catalog"||c.key==="shop"?"CATALOG_HEALTH":"TRAFFIC",severity:c.health==="RED"?"CRITICAL":"WARNING",title:`${c.label} needs attention`,observation:c.detail,likelyCause:`${c.label} is not yet connected to LMG Marketing.`,recommendation:`Connect and validate ${c.label} for Laughing Moose Gifts.`,confidence:.98});}
 const health:Health=checks.some(c=>c.health==="RED")?"RED":checks.some(c=>c.health==="YELLOW")?"YELLOW":"GREEN";
 return {channelId:"tiktok",channelName:"TikTok",health,checks,findings};
}
