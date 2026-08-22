import { db } from "@/lib/db";
import { wooRequest, wooStoreRequest, woocommerceConfigured } from "./client";

type WooProduct={id:number;name:string;sku:string;status:string;stock_status:string;stock_quantity:number|null;price:string;regular_price:string;sale_price:string;catalog_visibility:string;type:string;permalink?:string};
type StoreProduct={id:number;name:string;sku?:string;permalink?:string;is_in_stock?:boolean;low_stock_remaining?:number|null;prices?:{price?:string;regular_price?:string;sale_price?:string;currency_minor_unit?:number}};
type Funnel={sessions:number;productViews:number;addToCarts:number;checkoutStarts:number;purchases:number;revenue:number};
export type WebsiteProductHealth="GREEN"|"YELLOW"|"RED";
const zero=():Funnel=>({sessions:0,productViews:0,addToCarts:0,checkoutStarts:0,purchases:0,revenue:0});
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const rank:Record<WebsiteProductHealth,number>={RED:0,YELLOW:1,GREEN:2};

function fromStore(p:StoreProduct):WooProduct{
 const unit=Math.pow(10,Number(p.prices?.currency_minor_unit??2));
 const money=(v?:string)=>v==null||v===""?"":String(Number(v)/unit);
 return{id:p.id,name:p.name,sku:String(p.sku??""),status:"publish",stock_status:p.is_in_stock===false?"outofstock":"instock",stock_quantity:p.low_stock_remaining??null,price:money(p.prices?.price),regular_price:money(p.prices?.regular_price),sale_price:money(p.prices?.sale_price),catalog_visibility:"visible",type:"simple",permalink:p.permalink};
}

async function allPublished(){
 if(woocommerceConfigured()){
  const out:WooProduct[]=[];for(let page=1;page<=100;page++){const rows=await wooRequest<WooProduct[]>("/products",{per_page:100,page,status:"publish"});out.push(...rows);if(rows.length<100)break;}return{products:out,adminConnected:true};
 }
 const out:WooProduct[]=[];for(let page=1;page<=100;page++){const rows=await wooStoreRequest<StoreProduct[]>("/products",{per_page:100,page});out.push(...rows.map(fromStore));if(rows.length<100)break;}return{products:out,adminConnected:false};
}

function healthFor(p:WooProduct,f:Funnel,telemetry:boolean,adminConnected:boolean){
 const reasons:string[]=[];let health:WebsiteProductHealth="GREEN";
 if(p.stock_status==="outofstock"||p.stock_quantity===0){health="RED";reasons.push("Out of stock");}
 if(p.catalog_visibility==="hidden"){health="RED";reasons.push("Hidden from catalog");}
 if(!String(p.sku??"").trim()){health="RED";reasons.push("Missing SKU");}
 if(health!=="RED"&&p.stock_quantity!=null&&p.stock_quantity>0&&p.stock_quantity<=3){health="YELLOW";reasons.push("Low stock");}
 if(!adminConnected&&health!=="RED"){health="YELLOW";reasons.push("Admin credentials unavailable; exact stock/settings limited");}
 if(!telemetry&&health!=="RED"){health="YELLOW";reasons.push("No product funnel telemetry");}
 if(telemetry&&f.productViews>=20&&f.purchases===0&&health!=="RED"){health="YELLOW";reasons.push("Views without purchases");}
 if(telemetry&&f.addToCarts>=3&&f.checkoutStarts===0&&health!=="RED"){health="YELLOW";reasons.push("Cart-to-checkout dropoff");}
 return{health,reasons};
}
function add(a:Funnel,m:any){a.sessions+=m.sessions;a.productViews+=m.productViews;a.addToCarts+=m.addToCarts;a.checkoutStarts+=m.checkoutStarts;a.purchases+=m.purchases;a.revenue+=Number(m.revenue);return a;}
function sourceName(v:string){return v.replace(/^lmg-analytics:?/,"")||"unattributed";}
function sourceDiagnosis(f:Funnel){const conversion=f.productViews?f.purchases/f.productViews:null;const cartRate=f.productViews?f.addToCarts/f.productViews:null;let health:WebsiteProductHealth="YELLOW",diagnosis="Insufficient source-specific traffic.";if(f.productViews>=20&&f.purchases===0){health="RED";diagnosis="Product views from this source are not producing purchases.";}else if(f.productViews>=20&&cartRate!=null&&cartRate<.03){health="RED";diagnosis="Visitors reach the product but rarely add it to cart.";}else if(f.addToCarts>=5&&f.checkoutStarts/f.addToCarts<.3){health="RED";diagnosis="Strong cart-to-checkout dropoff from this source.";}else if(f.checkoutStarts>=3&&f.purchases===0){health="RED";diagnosis="Checkout starts are not becoming purchases.";}else if(f.productViews>=10&&conversion!=null&&conversion>=.02){health="GREEN";diagnosis="This source is converting product views at 2% or better.";}else if(f.productViews>0){health="YELLOW";diagnosis="This source has product traffic but needs more volume or stronger conversion.";}return{health,diagnosis,conversion,cartRate,checkoutRate:f.addToCarts?f.checkoutStarts/f.addToCarts:null,purchaseFromCheckout:f.checkoutStarts?f.purchases/f.checkoutStarts:null};}

export async function getWebsiteProductHealth(){
 const loaded=await allPublished();const products=loaded.products;const skus=products.map(p=>String(p.sku??"").trim()).filter(Boolean);
 const dbProducts=skus.length?await db.product.findMany({where:{sku:{in:skus}},select:{id:true,sku:true}}):[];const bySku=new Map(dbProducts.map(p=>[p.sku,p.id]));const ids=dbProducts.map(p=>p.id);const since=new Date(Date.now()-7*86400000);
 const metrics=ids.length?await db.funnelMetric.findMany({where:{source:{startsWith:"lmg-analytics"},date:{gte:since},productId:{in:ids}},select:{productId:true,sessions:true,productViews:true,addToCarts:true,checkoutStarts:true,purchases:true,revenue:true}}):[];
 const agg=new Map<string,Funnel>();for(const m of metrics){if(!m.productId)continue;agg.set(m.productId,add(agg.get(m.productId)??zero(),m));}
 const rows=products.map(p=>{const id=bySku.get(String(p.sku??"").trim());const funnel=id?(agg.get(id)??zero()):zero();const telemetry=Boolean(id&&agg.has(id));const diagnosis=healthFor(p,funnel,telemetry,loaded.adminConnected);return{id:p.id,sku:p.sku,name:p.name,price:p.price?n(p.price):null,stock:p.stock_quantity,stockStatus:p.stock_status,visibility:p.catalog_visibility,permalink:p.permalink??null,health:diagnosis.health,reasons:diagnosis.reasons,telemetryAvailable:telemetry,funnel:{...funnel,conversion:funnel.productViews?funnel.purchases/funnel.productViews:null,cartRate:funnel.productViews?funnel.addToCarts/funnel.productViews:null,checkoutRate:funnel.addToCarts?funnel.checkoutStarts/funnel.addToCarts:null}};}).sort((a,b)=>rank[a.health]-rank[b.health]||a.name.localeCompare(b.name));
 return{summary:{active:rows.length,red:rows.filter(x=>x.health==="RED").length,yellow:rows.filter(x=>x.health==="YELLOW").length,green:rows.filter(x=>x.health==="GREEN").length,withTelemetry:rows.filter(x=>x.telemetryAvailable).length,adminConnected:loaded.adminConnected},products:rows};
}

async function findProduct(clean:string){
 if(woocommerceConfigured()){const found=await wooRequest<WooProduct[]>("/products",{sku:clean,per_page:10});return{product:found[0],adminConnected:true};}
 const found=await wooStoreRequest<StoreProduct[]>("/products",{sku:clean,per_page:10});return{product:found[0]?fromStore(found[0]):undefined,adminConnected:false};
}

export async function diagnoseWebsiteProduct(sku:string){
 const clean=sku.trim();if(!clean)throw new Error("SKU is required.");const loaded=await findProduct(clean);const p=loaded.product;if(!p)throw new Error(`WooCommerce could not find SKU ${clean}.`);
 const dbProduct=await db.product.findUnique({where:{sku:clean},select:{id:true}});const since=new Date(Date.now()-7*86400000);const metrics=dbProduct?await db.funnelMetric.findMany({where:{source:{startsWith:"lmg-analytics"},date:{gte:since},productId:dbProduct.id},select:{source:true,sessions:true,productViews:true,addToCarts:true,checkoutStarts:true,purchases:true,revenue:true}}):[];
 const f=metrics.reduce((a,m)=>add(a,m),zero());const bySource=new Map<string,Funnel>();for(const m of metrics){const key=sourceName(m.source);bySource.set(key,add(bySource.get(key)??zero(),m));}const sourceBreakdown=[...bySource.entries()].map(([source,x])=>({source,...x,...sourceDiagnosis(x)})).sort((a,b)=>b.revenue-a.revenue||b.productViews-a.productViews);
 const telemetry=metrics.length>0;const diag=healthFor(p,f,telemetry,loaded.adminConnected);const conversion=f.productViews?f.purchases/f.productViews:null;const targetMin=conversion&&conversion>0?Math.ceil(4/conversion):null;const targetMax=conversion&&conversion>0?Math.ceil(6/conversion):null;
 const findings:Array<{layer:string;severity:"CRITICAL"|"WARNING"|"WATCH";title:string;observation:string;recommendation:string;confidence:number}>=[];
 if(!loaded.adminConnected)findings.push({layer:"DATA_GAP",severity:"WATCH",title:"WooCommerce admin credentials are unavailable",observation:"Public catalog data is available, but exact inventory/settings and write controls require the private WooCommerce API.",recommendation:"Restore the WooCommerce consumer key and secret in the production environment.",confidence:1});
 if(p.stock_status==="outofstock"||p.stock_quantity===0)findings.push({layer:"INVENTORY",severity:"CRITICAL",title:"Product is out of stock",observation:"WooCommerce reports zero available inventory.",recommendation:"Replenish inventory or retire the product.",confidence:.99});
 if(p.catalog_visibility==="hidden")findings.push({layer:"CATALOG",severity:"CRITICAL",title:"Product is hidden from catalog",observation:"Catalog visibility is set to hidden.",recommendation:"Restore visible catalog/search placement unless intentionally hidden.",confidence:.99});
 if(!telemetry)findings.push({layer:"DATA_GAP",severity:"WATCH",title:"Product funnel telemetry is not yet available",observation:"No SKU-level LMG Analytics records were found in the last 7 days.",recommendation:"Confirm the LMG Analytics export is sending this SKU with source, product views, carts, checkout starts and purchases.",confidence:1});
 if(telemetry&&f.productViews>=20&&f.purchases===0)findings.push({layer:"CONVERSION",severity:"WARNING",title:"Traffic is not converting",observation:`${f.productViews} product views produced no purchases in the last 7 days.`,recommendation:"Review price, images, copy, shipping promise, trust signals and checkout friction before buying more traffic.",confidence:.9});
 if(telemetry&&f.addToCarts>=3&&f.checkoutStarts===0)findings.push({layer:"CHECKOUT",severity:"WARNING",title:"Cart-to-checkout dropoff",observation:`${f.addToCarts} add-to-carts produced no checkout starts.`,recommendation:"Inspect cart page, shipping costs, payment messaging and checkout links.",confidence:.92});
 return{sku:p.sku,name:p.name,id:p.id,health:diag.health,adminConnected:loaded.adminConnected,summary:{status:p.status,visibility:p.catalog_visibility,stock:p.stock_quantity,stockStatus:p.stock_status,currentPrice:p.price?n(p.price):null,regularPrice:p.regular_price?n(p.regular_price):null,salePrice:p.sale_price?n(p.sale_price):null,permalink:p.permalink??null},funnel:{...f,conversion,cartRate:f.productViews?f.addToCarts/f.productViews:null,checkoutRate:f.addToCarts?f.checkoutStarts/f.addToCarts:null,purchaseFromCheckout:f.checkoutStarts?f.purchases/f.checkoutStarts:null,revenuePerView:f.productViews?f.revenue/f.productViews:null},sourceBreakdown,trafficTarget:{minUnitsPerDay:4,maxUnitsPerDay:6,minDailyVisits:targetMin,maxDailyVisits:targetMax},findings};
}
