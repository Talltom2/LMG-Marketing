import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {wooRequest} from "@/lib/integrations/woocommerce/client";
import {publishCampaignLandingPage,publishCampaignCollectionPage,unpublishCampaignPage} from "@/lib/wordpress-campaign-pages";

type Obj=Record<string,any>;
type OpportunityId="landing-page"|"collection-page";
const labelFor=(id:OpportunityId)=>id==="landing-page"?"Dedicated Campaign Landing Page":"Campaign Collection Page";
const slugify=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
const site=(process.env.WOOCOMMERCE_URL||"https://laughingmoosegifts.com").replace(/\/$/,"");

async function productsForSkus(skus:string[]){
 const out:Obj[]=[];
 for(const sku of skus){const rows=await wooRequest<Obj[]>("/products",{sku,per_page:10});if(rows[0])out.push(rows[0]);}
 return out;
}

async function recordPublication(campaignId:string,opportunityId:OpportunityId,result:Obj){
 const title=`WooCommerce · ${labelFor(opportunityId)}`;
 const rec=await db.recommendation.findFirst({where:{campaignId,title},include:{actions:true}});
 if(!rec)return {recorded:false,note:"Campaign opportunity recommendation has not been created yet."};
 const existing=rec.actions.find(a=>a.actionType==="PUBLISH_EXECUTION");
 const summary=JSON.stringify({opportunityId,pageId:result.id,pageUrl:result.url,slug:result.slug,publishedAt:result.publishedAt,created:result.created});
 if(existing)await db.action.update({where:{id:existing.id},data:{completed:true,completedAt:new Date(),executionTarget:`WOOCOMMERCE:${opportunityId}`,resultSummary:summary}});
 else await db.action.create({data:{recommendationId:rec.id,actionType:"PUBLISH_EXECUTION",description:`Publish/update ${labelFor(opportunityId)} in WordPress.`,executionTarget:`WOOCOMMERCE:${opportunityId}`,completed:true,completedAt:new Date(),resultSummary:summary}});
 return {recorded:true,recommendationId:rec.id};
}

export async function POST(req:Request){
 try{
  const b=await req.json();
  const operation=String(b.operation||"PREVIEW").toUpperCase();
  const opportunityId=String(b.opportunityId||"") as OpportunityId;
  if(!["landing-page","collection-page"].includes(opportunityId))return NextResponse.json({error:"Unsupported WooCommerce campaign-page opportunity."},{status:400});
  const campaignId=String(b.campaignId||"");
  const campaignName=String(b.campaignName||"").trim();
  const headline=String(b.headline||campaignName).trim();
  const body=String(b.body||"").trim();
  const cta=String(b.cta||"Shop the Campaign").trim();
  const productSkus=Array.isArray(b.productSkus)?b.productSkus.map(String).filter(Boolean):[];
  if(!campaignName||!productSkus.length)return NextResponse.json({error:"Campaign name and at least one selected product are required."},{status:400});
  const products=await productsForSkus(productSkus);
  if(!products.length)return NextResponse.json({error:"None of the selected campaign products could be found in WooCommerce."},{status:404});
  const imageUrl=String(b.imageUrl||products.find(p=>p.images?.[0]?.src)?.images?.[0]?.src||"");
  if(!imageUrl)return NextResponse.json({error:"A campaign image is required before this page can be published."},{status:400});
  const slug=`${opportunityId==="landing-page"?"campaign":"collection"}-${slugify(campaignName)}`;
  const preview={opportunityId,label:labelFor(opportunityId),campaignName,headline,body,cta,imageUrl,productSkus,products:products.map(p=>({id:p.id,sku:p.sku,name:p.name,price:p.price,permalink:p.permalink,image:p.images?.[0]?.src||null})),slug,intendedUrl:`${site}/${slug}/`};
  if(operation==="PREVIEW")return NextResponse.json({ok:true,mode:"PREVIEW",preview});
  if(operation==="UNPUBLISH"){
   const pageId=Number(b.pageId||0);if(!pageId)return NextResponse.json({error:"Page id is required to unpublish."},{status:400});
   return NextResponse.json({ok:true,mode:"UNPUBLISH",result:await unpublishCampaignPage(pageId)});
  }
  if(operation!=="PUBLISH")return NextResponse.json({error:"Unsupported operation."},{status:400});
  const target={campaignId,campaignName,opportunityId,headline,body,cta,imageUrl,productSkus,startAt:String(b.startAt||new Date().toISOString()),endAt:String(b.endAt||new Date(Date.now()+30*86400000).toISOString())};
  const result=opportunityId==="landing-page"?await publishCampaignLandingPage(target):await publishCampaignCollectionPage(target);
  const persistence=campaignId?await recordPublication(campaignId,opportunityId,result):{recorded:false,note:"No campaign id supplied."};
  return NextResponse.json({ok:true,mode:"PUBLISH",preview,result,persistence});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"WooCommerce campaign page operation failed."},{status:502})}
}
