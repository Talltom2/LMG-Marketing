import {db} from "@/lib/db";
import {fetchGa4DailyFunnel} from "@/lib/ga4";

const LIVE_SOURCE="lmg-analytics:ga4-live";
const SIX_HOURS=6*60*60*1000;
const DAY=86400000;

function utcDay(value:string){
  const date=new Date(`${value}T00:00:00Z`);
  if(Number.isNaN(date.getTime())) throw new Error(`Invalid GA4 date: ${value}`);
  return date;
}

export async function syncGa4FunnelIfStale(force=false){
  const latest=await db.syncRun.findFirst({
    where:{source:"ga4-funnel-live",status:"COMPLETED"},
    orderBy:{completedAt:"desc"},
    select:{completedAt:true},
  });

  if(!force&&latest?.completedAt&&Date.now()-latest.completedAt.getTime()<SIX_HOURS){
    return {ok:true,skipped:true,lastCompletedAt:latest.completedAt};
  }

  const run=await db.syncRun.create({data:{source:"ga4-funnel-live"}});
  try{
    const yesterday=new Date(Date.now()-DAY);
    const endDate=yesterday.toISOString().slice(0,10);
    const startDate=new Date(yesterday.getTime()-7*DAY).toISOString().slice(0,10);
    const rows=await fetchGa4DailyFunnel(startDate,endDate);

    const channel=await db.channel.upsert({
      where:{type_name:{type:"WOOCOMMERCE",name:"Laughing Moose Gifts Website"}},
      create:{type:"WOOCOMMERCE",name:"Laughing Moose Gifts Website",externalSource:"ga4",externalId:"website"},
      update:{active:true},
    });

    let saved=0;
    for(const row of rows){
      const date=utcDay(row.date);
      await db.funnelMetric.deleteMany({where:{date,source:LIVE_SOURCE,channelId:channel.id,productId:null}});
      await db.funnelMetric.create({data:{
        date,
        source:LIVE_SOURCE,
        channelId:channel.id,
        productId:null,
        sessions:Math.max(0,Math.round(row.users||row.sessions)),
        productViews:Math.max(0,Math.round(row.pageViews)),
        addToCarts:Math.max(0,Math.round(row.addToCarts)),
        checkoutStarts:Math.max(0,Math.round(row.checkouts)),
        purchases:Math.max(0,Math.round(row.transactions)),
        revenue:0,
      }});
      saved++;
    }

    await db.syncRun.update({where:{id:run.id},data:{status:"COMPLETED",completedAt:new Date(),recordsRead:rows.length,recordsSaved:saved}});
    return {ok:true,skipped:false,startDate,endDate,read:rows.length,saved};
  }catch(error){
    await db.syncRun.update({where:{id:run.id},data:{status:"FAILED",completedAt:new Date(),errorMessage:error instanceof Error?error.message.slice(0,2000):"Unknown GA4 funnel sync error"}});
    throw error;
  }
}

export const GA4_LIVE_FUNNEL_SOURCE=LIVE_SOURCE;
