import { walmartRequest } from "./client";

export type ProductHealth="GREEN"|"YELLOW"|"RED";
export type ProductFinding={layer:string;severity:"WARNING"|"CRITICAL"|"WATCH";title:string;observation:string;likelyCause:string;recommendation:string;confidence:number};
type PricingResponse={data?:{pricingInsightsResponseList?:Array<any>}};

type Lookup={sku:string;item:any|null;pricing:any|null};
const normalize=(v:string)=>v.toUpperCase().replace(/[^A-Z0-9]/g,"");
function candidates(input:string){const clean=input.trim();const out=[clean];if(/^LMG/i.test(clean))out.push(clean.replace(/^LMG[-_ ]?/i,""));else out.push(`LMG${clean}`);return [...new Set(out.filter(Boolean))];}
async function trySku(sku:string):Promise<Lookup>{
 const [itemResult,pricingResult]=await Promise.allSettled([
  walmartRequest<any>(`/v3/items/${encodeURIComponent(sku)}?productIdType=SKU`),
  walmartRequest<PricingResponse>("/v3/price/getPricingInsights",{method:"POST",body:JSON.stringify({searchCriteria:{searchField:"SKU",searchValue:[sku]}})})
 ]);
 const item=itemResult.status==="fulfilled"?itemResult.value:null;
 const pricing=pricingResult.status==="fulfilled"?(pricingResult.value.data?.pricingInsightsResponseList?.[0]??null):null;
 return {sku,item,pricing};
}
async function resolveByCatalog(input:string):Promise<string|null>{
 const target=normalize(input.replace(/^LMG/i,""));
 for(let offset=0;offset<1000;offset+=50){
  const response=await walmartRequest<any>(`/v3/items?limit=50&offset=${offset}`);
  const rows=Array.isArray(response?.ItemResponse)?response.ItemResponse:[];
  for(const row of rows){const candidate=String(row?.sku??"");const n=normalize(candidate);if(n===normalize(input)||n===target||normalize(candidate.replace(/^LMG/i,""))===target)return candidate;}
  const total=Number(response?.totalItems??0);if(rows.length===0||(total&&offset+rows.length>=total))break;
 }
 return null;
}

export async function diagnoseWalmartProduct(sku:string){
 const clean=sku.trim(); if(!clean) throw new Error("SKU is required.");
 let lookup:Lookup|null=null;
 for(const candidate of candidates(clean)){const result=await trySku(candidate);if(result.item||result.pricing){lookup=result;break;}}
 if(!lookup){const resolved=await resolveByCatalog(clean);if(resolved)lookup=await trySku(resolved);}
 if(!lookup||(!lookup.item&&!lookup.pricing)) throw new Error(`Walmart could not resolve ${clean} to a marketplace SKU. Try the Walmart SKU, UPC, or WPID shown in Seller Center.`);
 const {item,pricing}=lookup; const resolvedSku=lookup.sku;
 const root=item?.ItemResponse?.[0]??item?.items?.[0]??item?.item??item;
 const publish=String(root?.publishedStatus??root?.publishedStatusName??root?.lifecycleStatus??pricing?.itemPublishStatus??"UNKNOWN").toUpperCase();
 const inventory=Number(pricing?.inventoryCount??root?.inventoryCount??NaN);
 const buyBox=pricing?.buyBoxWinRate==null?null:Number(pricing.buyBoxWinRate);
 const traffic=pricing?.traffic??null;
 const competitive=pricing?.priceCompetitive==null?null:Boolean(pricing.priceCompetitive);
 const currentPrice=pricing?.currentPrice==null?null:Number(pricing.currentPrice);
 const suggestedPrice=pricing?.suggestedPrice==null?null:Number(pricing.suggestedPrice);
 const gmv30=pricing?.gmv30==null?null:Number(pricing.gmv30);
 const fulfillment=pricing?.fulfillment??root?.fulfillmentType??null;
 const findings:ProductFinding[]=[];
 if(!publish.includes("PUBLISH")) findings.push({layer:"CATALOG_HEALTH",severity:"CRITICAL",title:"Item is not clearly published",observation:`Walmart publish/lifecycle state is ${publish}.`,likelyCause:"Catalog validation, lifecycle, inventory, compliance, or publishing restrictions may be preventing normal exposure.",recommendation:"Inspect Walmart item errors and listing-quality issues before changing price or advertising.",confidence:.92});
 if(Number.isFinite(inventory)&&inventory<=0) findings.push({layer:"INVENTORY",severity:"CRITICAL",title:"Item is out of stock",observation:"Available inventory is zero.",likelyCause:"The offer cannot transact and may disappear from search exposure.",recommendation:"Replenish or correct Walmart inventory before other optimization work.",confidence:.99});
 else if(Number.isFinite(inventory)&&inventory<=3) findings.push({layer:"INVENTORY",severity:"WARNING",title:"Inventory is very low",observation:`Only ${inventory} units are shown in Pricing Insights.`,likelyCause:"Low stock can limit transactability and creates imminent lost-sales risk.",recommendation:"Replenish inventory and verify fulfillment-node quantities.",confidence:.95});
 if(buyBox!=null&&buyBox<50) findings.push({layer:"OFFER",severity:buyBox<10?"CRITICAL":"WARNING",title:"Weak Buy Box performance",observation:`Buy Box win rate is ${buyBox.toFixed(1)}%.`,likelyCause:"Price, shipping promise, fulfillment or competing offers are limiting ownership of the offer.",recommendation:"Compare current total price, Walmart Buy Box price, competitor price, suggested price and fulfillment promise before approving an offer change.",confidence:.94});
 if(competitive===false) findings.push({layer:"OFFER",severity:"WARNING",title:"Price is not competitive",observation:`Current price ${currentPrice==null?"is available":`is $${currentPrice.toFixed(2)}`}${suggestedPrice==null?"":`; Walmart suggested price is $${suggestedPrice.toFixed(2)}`}.`,likelyCause:"Walmart sees a recoverable pricing competitiveness gap.",recommendation:"Model margin impact of Walmart's suggested/competitive price and only change price after approval.",confidence:.96});
 if(traffic==="LOW"||traffic==="VERY_LOW") findings.push({layer:"VISIBILITY",severity:traffic==="VERY_LOW"?"WARNING":"WATCH",title:"Low Walmart traffic",observation:`Pricing Insights classifies traffic as ${traffic}.`,likelyCause:buyBox!=null&&buyBox<50?"Offer competitiveness/Buy Box loss may be suppressing effective exposure; discoverability may also contribute.":"Search discoverability, taxonomy, attributes, title/content, demand, or keyword coverage may be limiting exposure.",recommendation:"Request SKU-level Search Insights and inspect impressions/click/add-to-cart/sales ranks plus Walmart keyword recommendations.",confidence:.84});
 if(gmv30===0&&(!traffic||traffic==="LOW"||traffic==="VERY_LOW")) findings.push({layer:"DEMAND",severity:"WATCH",title:"No recent GMV signal",observation:"Pricing Insights shows no 30-day GMV for this SKU.",likelyCause:"The item may have insufficient exposure, weak conversion, or limited recent demand.",recommendation:"Use Item Performance history to separate a traffic problem from a conversion problem before changing content or price.",confidence:.72});
 const health:ProductHealth=findings.some(f=>f.severity==="CRITICAL")?"RED":findings.length?"YELLOW":"GREEN";
 return {requestedSku:clean,sku:resolvedSku,resolvedSku:resolvedSku!==clean?resolvedSku:null,name:pricing?.itemName??root?.productName??root?.itemName??resolvedSku,health,summary:{publishStatus:publish,inventory:Number.isFinite(inventory)?inventory:null,buyBoxWinRate:buyBox,traffic,priceCompetitive:competitive,currentPrice,suggestedPrice,fulfillment,gmv30},findings,evidenceGaps:{searchInsights:true,itemPerformance:true},nextEvidence:"Run SKU-filtered Search Insights and Item Performance reports for historical visibility, conversion, keyword and sales evidence."};
}
