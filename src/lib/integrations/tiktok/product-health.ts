import {db} from "@/lib/db";
import {getWebsiteProductHealth,diagnoseWebsiteProduct} from "@/lib/integrations/woocommerce/product-health";

type Health="GREEN"|"YELLOW"|"RED";
const catalogConnected=()=>Boolean(process.env.TIKTOK_CATALOG_ID);
const pixelConnected=()=>Boolean(process.env.TIKTOK_PIXEL_ID);
const eventsConnected=()=>Boolean(process.env.TIKTOK_EVENTS_ACCESS_TOKEN);
const shopConnected=()=>Boolean(process.env.TIKTOK_SHOP_ID);

export async function getTikTokProductHealth(){
 const website=await getWebsiteProductHealth();
 const since=new Date(Date.now()-7*86400000);
 const products=website.products;
 const dbProducts=await db.product.findMany({where:{sku:{in:products.map((p:any)=>String(p.sku)).filter(Boolean)}},select:{id:true,sku:true}});
 const byId=new Map(dbProducts.map(p=>[p.id,p.sku]));
 const metrics=dbProducts.length?await db.funnelMetric.findMany({where:{date:{gte:since},productId:{in:dbProducts.map(p=>p.id)},source:"lmg-analytics:tiktok"},select:{productId:true,sessions:true,productViews:true,addToCarts:true,checkoutStarts:true,purchases:true,revenue:true}}):[];
 const agg=new Map<string,{sessions:number;views:number;carts:number;checkout:number;purchases:number;revenue:number}>();
 for(const m of metrics){if(!m.productId)continue;const sku=byId.get(m.productId);if(!sku)continue;const a=agg.get(sku)??{sessions:0,views:0,carts:0,checkout:0,purchases:0,revenue:0};a.sessions+=m.sessions;a.views+=m.productViews;a.carts+=m.addToCarts;a.checkout+=m.checkoutStarts;a.purchases+=m.purchases;a.revenue+=Number(m.revenue);agg.set(sku,a);}
 const rows=products.map((p:any)=>{const t=agg.get(String(p.sku))??{sessions:0,views:0,carts:0,checkout:0,purchases:0,revenue:0};let health:Health=p.health;const reasons=[...(p.reasons??[])];if(!catalogConnected()){if(health!=="RED")health="YELLOW";reasons.push("TikTok catalog not connected");}if(!pixelConnected()&&!eventsConnected()){if(health!=="RED")health="YELLOW";reasons.push("TikTok conversion telemetry not connected");}if(t.views>=20&&t.purchases===0){health="RED";reasons.push("TikTok views without purchases");}else if(t.views>=10&&t.purchases>0&&health!=="RED")health="GREEN";return{...p,health,reasons,tiktok:{catalogConnected:catalogConnected(),shopConnected:shopConnected(),sessions:t.sessions,productViews:t.views,addToCarts:t.carts,checkoutStarts:t.checkout,purchases:t.purchases,revenue:t.revenue,conversion:t.views?t.purchases/t.views:null}};});
 return{summary:{active:rows.length,red:rows.filter((x:any)=>x.health==="RED").length,yellow:rows.filter((x:any)=>x.health==="YELLOW").length,green:rows.filter((x:any)=>x.health==="GREEN").length,catalogConnected:catalogConnected(),pixelConnected:pixelConnected(),eventsConnected:eventsConnected(),shopConnected:shopConnected()},products:rows};
}

export async function diagnoseTikTokProduct(sku:string){
 const base=await diagnoseWebsiteProduct(sku);
 const source=(base.sourceBreakdown??[]).find((x:any)=>x.source==="tiktok")??null;
 const findings=[...base.findings];
 if(!catalogConnected())findings.push({layer:"CATALOG_HEALTH",severity:"WARNING",title:"TikTok catalog is not connected",observation:"LMG Marketing has no TikTok catalog ID configured.",recommendation:"Connect the WooCommerce/TikTok catalog and validate product synchronization before diagnosing item eligibility.",confidence:1});
 if(!pixelConnected())findings.push({layer:"CONVERSION",severity:"WARNING",title:"TikTok Pixel is not connected",observation:"No TIKTOK_PIXEL_ID is configured.",recommendation:"Connect and validate the TikTok Pixel for browser-side ecommerce events.",confidence:1});
 if(!eventsConnected())findings.push({layer:"CONVERSION",severity:"WARNING",title:"TikTok Events API is not connected",observation:"No server-side TikTok Events API credential is configured.",recommendation:"Connect Events API so conversion tracking is resilient to browser loss and can be compared against Pixel events.",confidence:1});
 if(source&&source.productViews>=20&&source.purchases===0)findings.push({layer:"CONVERSION",severity:"WARNING",title:"TikTok traffic is not converting",observation:`${source.productViews} TikTok-attributed product views produced no purchases in the last 7 days.`,recommendation:"Review TikTok creative-message match, landing-page relevance, price/offer, shipping and checkout friction before increasing TikTok traffic.",confidence:.93});
 let health:Health=base.health;if(findings.some((f:any)=>f.severity==="CRITICAL"))health="RED";else if(findings.length&&health!=="RED")health="YELLOW";
 return{...base,health,tiktok:{catalogConnected:catalogConnected(),pixelConnected:pixelConnected(),eventsConnected:eventsConnected(),shopConnected:shopConnected(),sourcePerformance:source},findings};
}
