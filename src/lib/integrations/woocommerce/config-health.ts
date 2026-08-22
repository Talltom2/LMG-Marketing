import { wooRequest } from "./client";

export type ConfigHealth="GREEN"|"YELLOW"|"RED";
type Finding={layer:string;severity:"CRITICAL"|"WARNING"|"WATCH";title:string;observation:string;recommendation:string;confidence:number};
type Check={key:string;label:string;health:ConfigHealth;value:string;detail:string};
const val=(x:any)=>String(x?.value??x?.setting??x??"").trim();
const enabled=(x:any)=>["yes","true","1","enabled"].includes(val(x).toLowerCase());
async function safe<T>(fn:()=>Promise<T>){try{return{ok:true as const,data:await fn()}}catch(error){return{ok:false as const,error:error instanceof Error?error.message:"Unavailable"}}}

export async function getWooConfigHealth(){
 const [general,products,tax,accounts,payments,zones,status]=await Promise.all([
  safe(()=>wooRequest<any[]>("/settings/general")),
  safe(()=>wooRequest<any[]>("/settings/products")),
  safe(()=>wooRequest<any[]>("/settings/tax")),
  safe(()=>wooRequest<any[]>("/settings/account")),
  safe(()=>wooRequest<any[]>("/payment_gateways")),
  safe(()=>wooRequest<any[]>("/shipping/zones")),
  safe(()=>wooRequest<any>("/system_status")),
 ]);
 const checks:Check[]=[];const findings:Finding[]=[];const gaps:string[]=[];
 const map=(r:any)=>new Map((r.ok?r.data:[]).map((x:any)=>[x.id,x]));
 const g=map(general),p=map(products),t=map(tax),a=map(accounts);
 function push(key:string,label:string,health:ConfigHealth,value:string,detail:string){checks.push({key,label,health,value,detail});}
 function issue(layer:string,severity:Finding["severity"],title:string,observation:string,recommendation:string,confidence=.95){findings.push({layer,severity,title,observation,recommendation,confidence});}
 if(general.ok){const currency=val(g.get("woocommerce_currency"));push("currency","Store currency",currency==="USD"?"GREEN":"YELLOW",currency||"Not set",currency==="USD"?"Store currency is USD.":"Verify the intended selling currency.");if(currency&&currency!=="USD")issue("STORE_SETTINGS","WARNING","Unexpected store currency",`WooCommerce currency is ${currency}.`,`Confirm currency should be ${currency}; otherwise restore USD before processing orders.`);const countries=val(g.get("woocommerce_allowed_countries"));push("selling-locations","Selling locations",countries?"GREEN":"YELLOW",countries||"Not returned","WooCommerce selling-location policy is readable.");}else gaps.push("general settings");
 if(products.ok){const manage=p.get("woocommerce_manage_stock");const stockEnabled=enabled(manage);push("stock-management","Inventory management",stockEnabled?"GREEN":"YELLOW",stockEnabled?"Enabled":"Disabled",stockEnabled?"WooCommerce global stock management is enabled.":"Stock quantities may not be centrally managed by WooCommerce.");if(!stockEnabled)issue("INVENTORY_SETTINGS","WARNING","Global stock management is disabled","WooCommerce reports stock management disabled.","Confirm Sellerchamp or another system is intentionally authoritative; otherwise enable WooCommerce stock management.");const threshold=val(p.get("woocommerce_notify_low_stock_amount"));push("low-stock-threshold","Low-stock threshold","GREEN",threshold||"Not set","Used to warn before items become unavailable.");}else gaps.push("product settings");
 if(tax.ok){const taxes=enabled(t.get("woocommerce_calc_taxes"));push("taxes","Tax calculation",taxes?"GREEN":"YELLOW",taxes?"Enabled":"Disabled",taxes?"WooCommerce tax calculation is enabled.":"Taxes are not being calculated by WooCommerce.");}else gaps.push("tax settings");
 if(accounts.ok){const guest=enabled(a.get("woocommerce_enable_guest_checkout"));push("guest-checkout","Guest checkout",guest?"GREEN":"YELLOW",guest?"Enabled":"Disabled",guest?"Customers may buy without creating an account.":"Requiring accounts can add checkout friction.");if(!guest)issue("CHECKOUT_SETTINGS","WATCH","Guest checkout is disabled","Customers appear to be required to create/use an account to order.","Confirm this is intentional; enabling guest checkout may reduce checkout friction.",.8);}else gaps.push("account/checkout settings");
 if(payments.ok){const active=(payments.data??[]).filter((x:any)=>x.enabled===true||String(x.enabled)==="true");push("payments","Payment gateways",active.length?"GREEN":"RED",`${active.length} enabled`,active.length?active.map((x:any)=>x.title??x.id).join(", "):"No enabled payment gateway was returned.");if(!active.length)issue("PAYMENTS","CRITICAL","No enabled payment gateway detected","WooCommerce returned no enabled payment gateways.","Enable and test at least one production payment method before sending traffic to checkout.",.99);}else gaps.push("payment gateways");
 if(zones.ok){let enabledMethods=0;for(const z of zones.data??[]){const r=await safe(()=>wooRequest<any[]>(`/shipping/zones/${z.id}/methods`));if(r.ok)enabledMethods+=(r.data??[]).filter((m:any)=>m.enabled===true||String(m.enabled)==="true").length;}push("shipping","Shipping methods",enabledMethods?"GREEN":"RED",`${enabledMethods} enabled`,enabledMethods?"Enabled shipping methods were found across configured zones.":"No enabled shipping method was returned from configured zones.");if(!enabledMethods)issue("SHIPPING","CRITICAL","No enabled shipping method detected","Configured shipping zones returned no enabled shipping methods.","Review U.S./Canada shipping zones and enable the intended methods before checkout traffic is increased.",.98);}else gaps.push("shipping zones");
 if(status.ok){const env=status.data?.environment??status.data?.system_status?.environment??status.data??{};const https=String(env?.home_url??env?.site_url??"").startsWith("https://");push("https","HTTPS storefront",https?"GREEN":"YELLOW",https?"HTTPS":"Not confirmed",https?"System status reports an HTTPS URL.":"HTTPS could not be confirmed from WooCommerce system status.");const wpMem=val(env?.wp_memory_limit);if(wpMem)push("memory","WordPress memory",parseInt(wpMem)>=128?"GREEN":"YELLOW",wpMem,"Available WordPress memory reported by WooCommerce.");}else gaps.push("system status");
 for(const gap of gaps)issue("DATA_GAP","WATCH",`${gap} could not be inspected`,`The WooCommerce REST credential did not return ${gap}.`,`Keep the remainder of the configuration diagnosis, but verify this section manually or expand API permissions.`,1);
 const health:ConfigHealth=findings.some(f=>f.severity==="CRITICAL")?"RED":findings.length?"YELLOW":"GREEN";
 return{health,checks,findings,dataGaps:gaps,checkedAt:new Date().toISOString()};
}
