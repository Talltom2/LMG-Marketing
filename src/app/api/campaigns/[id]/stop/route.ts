import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {restoreHomepageHero,type HomepageSnapshot} from "@/lib/wordpress-homepage";
import {unpublishCampaignPage} from "@/lib/wordpress-campaign-pages";

type HeroResult={publishedAt?:string;restoredAt?:string;snapshot?:HomepageSnapshot;error?:string};
type PageResult={publishedAt?:string;unpublishedAt?:string;pageId?:number;pageUrl?:string;imageUrl?:string;error?:string};
const parse=<T,>(s:string|null)=>{if(!s)return null;try{return JSON.parse(s) as T}catch{return null}};

export async function POST(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const{id}=await params;
  const campaign=await db.campaign.findUnique({where:{id},include:{recommendations:{include:{actions:true}}}});if(!campaign)return NextResponse.json({error:"Campaign not found."},{status:404});
  const actions=campaign.recommendations.flatMap(r=>r.actions),stoppedAt=new Date(),outcomes:string[]=[];
  for(const action of actions){
   if(action.completed)continue;
   if(action.actionType==="WORDPRESS_HOMEPAGE_HERO"){
    const result=parse<HeroResult>(action.resultSummary)||{};
    if(result.publishedAt&&result.snapshot&&!result.restoredAt){try{const restored=await restoreHomepageHero(result.snapshot);await db.action.update({where:{id:action.id},data:{completed:true,completedAt:stoppedAt,resultSummary:JSON.stringify({...result,restoredAt:restored.restoredAt,error:undefined,stoppedAt:stoppedAt.toISOString()})}});outcomes.push("Homepage hero restored immediately.");continue}catch(e){await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify({...result,error:e instanceof Error?e.message:"Emergency restore failed",stoppedAt:stoppedAt.toISOString()})}});outcomes.push("Homepage hero restore needs attention.");continue}}
   }
   if(action.actionType==="SCHEDULE_EXECUTION"&&["WOOCOMMERCE:landing-page","WOOCOMMERCE:collection-page"].includes(action.executionTarget||"")){
    const result=parse<PageResult>(action.resultSummary)||{};
    if(result.publishedAt&&result.pageId&&!result.unpublishedAt){try{const down=await unpublishCampaignPage(result.pageId);await db.action.update({where:{id:action.id},data:{completed:true,completedAt:stoppedAt,resultSummary:JSON.stringify({...result,unpublishedAt:down.unpublishedAt,stoppedAt:stoppedAt.toISOString()})}});outcomes.push(`${action.executionTarget?.endsWith("landing-page")?"Landing":"Collection"} page unpublished immediately.`);continue}catch(e){await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify({...result,error:e instanceof Error?e.message:"Emergency unpublish failed",stoppedAt:stoppedAt.toISOString()})}});outcomes.push("Campaign page unpublish needs attention.");continue}}
   }
   await db.action.update({where:{id:action.id},data:{completed:true,completedAt:stoppedAt,resultSummary:JSON.stringify({stoppedAt:stoppedAt.toISOString(),reason:"Campaign emergency stop"})}});
  }
  await db.campaign.update({where:{id},data:{status:"PAUSED"}});return NextResponse.json({ok:true,status:"STOPPED",stoppedAt:stoppedAt.toISOString(),outcomes});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to stop campaign"},{status:500})}
}
