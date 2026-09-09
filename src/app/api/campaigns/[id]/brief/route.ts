import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {buildCampaignBrief} from "@/lib/campaign-packets";
import {channelDeliverables} from "@/lib/campaign-channels";
import {getWebsiteProductHealth} from "@/lib/integrations/woocommerce/product-health";
import {wooRequest,woocommerceConfigured} from "@/lib/integrations/woocommerce/client";

type WooProduct={sku?:string;description?:string;short_description?:string;price?:string;stock_quantity?:number|null;permalink?:string;images?:Array<{src:string}>};
const strip=(value:string|undefined)=>String(value??"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const campaign=await db.campaign.findUnique({where:{id},include:{products:{include:{product:true}},recommendations:{include:{actions:true}},closeout:true}});
 if(!campaign)return NextResponse.json({error:"Campaign not found"},{status:404});
 const channels=Array.isArray(campaign.channels)?campaign.channels.map(String):[];
 const health=await getWebsiteProductHealth().catch(()=>null);
 const healthBySku=new Map((health?.products??[]).map(p=>[p.sku,p]));
 const catalog=new Map<string,WooProduct>();
 if(woocommerceConfigured())await Promise.all(campaign.products.map(async row=>{const found=await wooRequest<WooProduct[]>("/products",{sku:row.product.sku,per_page:5}).catch(()=>[]);if(found[0])catalog.set(row.product.sku,found[0]);}));
 const productIds=campaign.products.map(row=>row.product.id);
 const historical=await db.commerceMetric.groupBy({by:["productId"],where:{productId:{in:productIds},date:{lt:campaign.startDate}},_sum:{units:true,revenue:true}});
 const historicalMap=new Map(historical.map(row=>[row.productId,row._sum]));
 const previous=await db.campaignCloseout.findMany({where:{campaignId:{not:id},learnings:{not:null}},orderBy:{closedAt:"desc"},take:5});
 const campaignHistory=await db.campaign.findMany({where:{id:{not:id},status:"COMPLETED",products:{some:{productId:{in:productIds}}}},select:{name:true,startDate:true,endDate:true,objective:true,offer:true,closeout:true},orderBy:{endDate:"desc"},take:5});
 const input={id:campaign.id,name:campaign.name,objective:campaign.objective,offer:campaign.offer,startDate:campaign.startDate.toISOString(),endDate:campaign.endDate.toISOString(),budget:Number(campaign.budget),channels,deliverables:channelDeliverables(channels),products:campaign.products.map(row=>{const live=catalog.get(row.product.sku),fallback=healthBySku.get(row.product.sku),past=historicalMap.get(row.product.id);return{sku:row.product.sku,name:row.product.name,role:row.role,description:strip(live?.short_description||live?.description),price:live?.price?Number(live.price):fallback?.price??null,inventory:live?.stock_quantity??fallback?.stock??null,url:live?.permalink??fallback?.permalink??null,images:live?.images?.map(image=>image.src)??[],historical:{units:Number(past?.units??0),revenue:Number(past?.revenue??0)}}}),campaignHistory,previousLearnings:previous.map(item=>item.learnings!).filter(Boolean)};
 return NextResponse.json(buildCampaignBrief(input));
}
