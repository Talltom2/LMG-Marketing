import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {publishHomepageHero,restoreHomepageHero,type HomepageSnapshot} from "@/lib/wordpress-homepage";
import {generateCampaignImage} from "@/lib/generate-campaign-image";
import {publishCampaignLandingPage,publishCampaignCollectionPage,unpublishCampaignPage,uploadCampaignImage} from "@/lib/wordpress-campaign-pages";
import {publishPinterestCampaignPins} from "@/lib/integrations/pinterest/board-manager";

type HeroTarget={slot:string;opportunityId:string;campaignName:string;headline:string;body:string;cta:string;destinationUrl:string;imageUrl:string;startAt:string;endAt:string};
type HeroResult={publishedAt?:string;restoredAt?:string;skippedAt?:string;snapshot?:HomepageSnapshot;wordpress?:unknown;error?:string};
type CalendarTarget={opportunityId:string;startAt:string;endAt:string};
type CreativeTarget={opportunityId:string;label:string;headline:string;body:string;cta:string};
type PageResult={publishedAt?:string;unpublishedAt?:string;pageId?:number;pageUrl?:string;imageUrl?:string;error?:string};
const parse=<T,>(s:string|null)=>{if(!s)return null;try{return JSON.parse(s) as T}catch{return null}};

export async function GET(req:NextRequest){
 const ua=req.headers.get("user-agent")||"";if(!ua.includes("vercel-cron")&&req.headers.get("x-lmg-internal")!==process.env.LMG_INTERNAL_SYNC_SECRET)return NextResponse.json({error:"Not authorized"},{status:401});
 const now=new Date();
 const actions=await db.action.findMany({where:{completed:false,OR:[{actionType:"WORDPRESS_HOMEPAGE_HERO"},{actionType:"SCHEDULE_EXECUTION",executionTarget:{in:["WOOCOMMERCE:landing-page","WOOCOMMERCE:collection-page"]}}]},include:{recommendation:{include:{actions:true,campaign:{include:{products:{include:{product:true}}}}}}},orderBy:{createdAt:"asc"}});
 const events:any[]=[];
 for(const action of actions){
  if(action.actionType==="WORDPRESS_HOMEPAGE_HERO"){
   const target=parse<HeroTarget>(action.executionTarget);if(!target)continue;const result=parse<HeroResult>(action.resultSummary)||{},start=new Date(target.startAt),end=new Date(target.endAt);
   try{if(now<start)continue;if(now>=start&&now<end&&!result.publishedAt){const pub=await publishHomepageHero({headline:target.headline,body:target.body,cta:target.cta,destinationUrl:target.destinationUrl,imageUrl:target.imageUrl});const next:HeroResult={...result,publishedAt:pub.publishedAt,snapshot:{pageId:pub.pageId,coverIndex:pub.coverIndex,coverRaw:pub.previousCoverRaw,capturedAt:pub.publishedAt},wordpress:{pageId:pub.pageId,mediaId:pub.mediaId,imageUrl:pub.imageUrl,verified:pub.verified}};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next)}});events.push({id:action.id,event:"PUBLISHED",campaign:target.campaignName,opportunity:"homepage-hero"});continue}if(now>=end){if(result.publishedAt&&result.snapshot&&!result.restoredAt){const restored=await restoreHomepageHero(result.snapshot),next:HeroResult={...result,restoredAt:restored.restoredAt};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next),completed:true,completedAt:new Date()}});await db.recommendation.update({where:{id:action.recommendationId},data:{status:"EXECUTED",executedAt:new Date()}});events.push({id:action.id,event:"RESTORED",campaign:target.campaignName,opportunity:"homepage-hero"})}else if(!result.publishedAt){const next:HeroResult={...result,skippedAt:new Date().toISOString(),error:"Scheduling window expired before publication executor ran."};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next),completed:true,completedAt:new Date()}});events.push({id:action.id,event:"MISSED",campaign:target.campaignName,opportunity:"homepage-hero"})}}}catch(e){const next:HeroResult={...result,error:e instanceof Error?e.message:"WordPress execution failed"};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next)}});events.push({id:action.id,event:"ERROR",campaign:target.campaignName,error:next.error})}
   continue;
  }

  const opportunityId=action.executionTarget?.split(":")[1] as "landing-page"|"collection-page"|undefined;if(!opportunityId)continue;
  const siblings=action.recommendation.actions,calendar=siblings.find(a=>a.actionType==="CALENDAR"),creative=siblings.find(a=>a.actionType==="CREATIVE_DRAFT"),image=siblings.find(a=>a.actionType==="AI_LIFESTYLE_IMAGE");
  const timing=parse<CalendarTarget>(calendar?.executionTarget??null),copy=parse<CreativeTarget>(creative?.description??null),campaign=action.recommendation.campaign;
  if(!timing||!copy||!image||!campaign)continue;
  const result=parse<PageResult>(action.resultSummary)||{},start=new Date(timing.startAt),end=new Date(timing.endAt),skus=campaign.products.map(p=>p.product.sku);
  try{
   if(now<start)continue;
   if(now>=start&&now<end&&!result.publishedAt){
    const generated=await generateCampaignImage(image.description);const uploaded=await uploadCampaignImage(generated.buffer,campaign.name,opportunityId);
    const target={campaignId:campaign.id,campaignName:campaign.name,opportunityId,headline:copy.headline||campaign.name,body:copy.body||campaign.objective||"",cta:copy.cta||"Shop the Campaign",imageUrl:uploaded.url,productSkus:skus,startAt:timing.startAt,endAt:timing.endAt};
    const pub=opportunityId==="landing-page"?await publishCampaignLandingPage(target):await publishCampaignCollectionPage(target);
    const next:PageResult={publishedAt:pub.publishedAt,pageId:pub.id,pageUrl:pub.url,imageUrl:uploaded.url};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next)}});events.push({id:action.id,event:"PUBLISHED",campaign:campaign.name,opportunity:opportunityId,url:pub.url});continue;
   }
   if(now>=end){if(result.publishedAt&&result.pageId&&!result.unpublishedAt){const down=await unpublishCampaignPage(result.pageId),next:PageResult={...result,unpublishedAt:down.unpublishedAt};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next),completed:true,completedAt:new Date()}});await db.recommendation.update({where:{id:action.recommendationId},data:{status:"EXECUTED",executedAt:new Date()}});events.push({id:action.id,event:"UNPUBLISHED",campaign:campaign.name,opportunity:opportunityId})}else if(!result.publishedAt){await db.action.update({where:{id:action.id},data:{completed:true,completedAt:new Date(),resultSummary:JSON.stringify({...result,error:"Scheduling window expired before page publication."})}});events.push({id:action.id,event:"MISSED",campaign:campaign.name,opportunity:opportunityId})}}
  }catch(e){const next:PageResult={...result,error:e instanceof Error?e.message:"Campaign page execution failed"};await db.action.update({where:{id:action.id},data:{resultSummary:JSON.stringify(next)}});events.push({id:action.id,event:"ERROR",campaign:campaign.name,opportunity:opportunityId,error:next.error})}
 }
 const approvedAssets=await db.campaignContentAsset.findMany({where:{approvalStatus:"APPROVED",publicationStatus:"SCHEDULED",scheduledAt:{lte:now}},include:{campaign:{include:{products:{include:{product:true}}}}},orderBy:{scheduledAt:"asc"}});
 for(const asset of approvedAssets){
  const campaign=asset.campaign,skus=campaign.products.map(row=>row.product.sku);
  try{
   if(asset.channel==="WOOCOMMERCE"){
    if(!asset.imageReference)throw new Error("Approved website content has no image reference.");
    if(asset.deliverable==="Homepage feature"){
     if(!asset.destinationUrl)throw new Error("Homepage feature has no destination URL.");
     const pub=await publishHomepageHero({headline:asset.headline||campaign.name,body:asset.bodyCopy||campaign.objective||"",cta:asset.cta||"Shop Now",destinationUrl:asset.destinationUrl,imageUrl:asset.imageReference});
     await db.campaignContentAsset.update({where:{id:asset.id},data:{publicationStatus:"PUBLISHED",publishedAt:new Date(pub.publishedAt),adapter:"WORDPRESS_HOMEPAGE",adapterConfirmation:pub as any}});
     events.push({id:asset.id,event:"PUBLISHED",campaign:campaign.name,deliverable:asset.deliverable,adapter:"WORDPRESS_HOMEPAGE"});
    }else if(asset.deliverable==="Dedicated landing page"||asset.deliverable==="Campaign collection page"){
     const opportunityId:"landing-page"|"collection-page"=asset.deliverable==="Dedicated landing page"?"landing-page":"collection-page";
     const target={campaignId:campaign.id,campaignName:campaign.name,opportunityId,headline:asset.headline||campaign.name,body:asset.bodyCopy||campaign.objective||"",cta:asset.cta||"Shop the Campaign",imageUrl:asset.imageReference,productSkus:skus,startAt:(asset.scheduledAt||campaign.startDate).toISOString(),endAt:campaign.endDate.toISOString()};
     const pub=opportunityId==="landing-page"?await publishCampaignLandingPage(target):await publishCampaignCollectionPage(target);
     await db.campaignContentAsset.update({where:{id:asset.id},data:{publicationStatus:"PUBLISHED",publishedAt:new Date(pub.publishedAt),adapter:"WORDPRESS_PAGE",adapterConfirmation:pub as any}});
     events.push({id:asset.id,event:"PUBLISHED",campaign:campaign.name,deliverable:asset.deliverable,adapter:"WORDPRESS_PAGE",url:pub.url});
    }
   }else if(asset.channel==="PINTEREST"){
    const tracking=(asset.trackingParameters??{}) as Record<string,unknown>,boardId=String(tracking.boardId??"").trim();if(!boardId)throw new Error("Pinterest content requires trackingParameters.boardId before scheduling.");
    const published=await publishPinterestCampaignPins(skus.map(sku=>({boardId,sku,campaignName:campaign.name,headline:asset.headline??undefined,description:asset.bodyCopy??undefined,cta:asset.cta??undefined,opportunityId:asset.deliverable})));
    await db.campaignContentAsset.update({where:{id:asset.id},data:{publicationStatus:"PUBLISHED",publishedAt:new Date(),adapter:"PINTEREST_PINS",adapterConfirmation:published as any}});
    events.push({id:asset.id,event:"PUBLISHED",campaign:campaign.name,deliverable:asset.deliverable,adapter:"PINTEREST_PINS",count:published.length});
   }
  }catch(e){await db.campaignContentAsset.update({where:{id:asset.id},data:{publicationStatus:"FAILED",adapterConfirmation:{error:e instanceof Error?e.message:"Publication failed",failedAt:new Date().toISOString()}}});events.push({id:asset.id,event:"ERROR",campaign:campaign.name,deliverable:asset.deliverable,error:e instanceof Error?e.message:"Publication failed"});}
 }
 return NextResponse.json({ok:true,checked:actions.length+approvedAssets.length,events,executedAt:new Date().toISOString()});
}
