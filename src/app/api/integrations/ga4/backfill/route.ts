import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {requireInternalSecret} from "@/lib/internal-auth";
import {fetchGa4DailyFunnel,ga4ConfigStatus} from "@/lib/ga4";

export const dynamic="force-dynamic";

function utcDay(value:string){const d=new Date(`${value}T00:00:00Z`);if(Number.isNaN(d.getTime()))throw new Error(`Invalid date ${value}`);return d}
function dayBefore(value:Date){return new Date(value.getTime()-86400000).toISOString().slice(0,10)}

export async function GET(){
  const earliest=await db.funnelMetric.findFirst({where:{source:{startsWith:"lmg-analytics:"}},orderBy:{date:"asc"},select:{date:true}});
  return NextResponse.json({configured:ga4ConfigStatus(),backfillThrough:earliest?dayBefore(earliest.date):new Date().toISOString().slice(0,10),firstLmgAnalyticsDate:earliest?.date??null});
}

export async function POST(request:NextRequest){
  try{
    requireInternalSecret(request);
    const body=await request.json().catch(()=>({})) as {startDate?:string;endDate?:string};
    const earliest=await db.funnelMetric.findFirst({where:{source:{startsWith:"lmg-analytics:"}},orderBy:{date:"asc"},select:{date:true}});
    const requestedEnd=body.endDate??new Date().toISOString().slice(0,10);
    const safeEnd=earliest?dayBefore(earliest.date):requestedEnd;
    const end=safeEnd<requestedEnd?safeEnd:requestedEnd;
    const defaultStart=new Date(Date.now()-183*86400000).toISOString().slice(0,10);
    const start=body.startDate??defaultStart;
    if(start>end)return NextResponse.json({ok:true,read:0,saved:0,message:"No historical gap exists before LMG Analytics tracking began.",startDate:start,endDate:end});
    const rows=await fetchGa4DailyFunnel(start,end);
    const channel=await db.channel.upsert({where:{type_name:{type:"WOOCOMMERCE",name:"Laughing Moose Gifts Website"}},create:{type:"WOOCOMMERCE",name:"Laughing Moose Gifts Website",externalSource:"ga4",externalId:"website"},update:{active:true}});
    const run=await db.syncRun.create({data:{source:"ga4-backfill"}});
    let saved=0;
    for(const row of rows){
      const date=utcDay(row.date);
      await db.funnelMetric.deleteMany({where:{date,source:"ga4:website",channelId:channel.id,productId:null}});
      await db.funnelMetric.create({data:{date,source:"ga4:website",channelId:channel.id,productId:null,sessions:Math.max(0,Math.round(row.users||row.sessions)),productViews:Math.max(0,Math.round(row.pageViews)),addToCarts:Math.max(0,Math.round(row.addToCarts)),checkoutStarts:Math.max(0,Math.round(row.checkouts)),purchases:Math.max(0,Math.round(row.transactions)),revenue:0}});
      saved++;
    }
    await db.syncRun.update({where:{id:run.id},data:{status:"COMPLETED",completedAt:new Date(),recordsRead:rows.length,recordsSaved:saved}});
    return NextResponse.json({ok:true,startDate:start,endDate:end,read:rows.length,saved,stoppedBeforeLmgAnalytics:earliest?.date??null,mapping:{visitors:"GA4 totalUsers (falls back to sessions)",pageViews:"screenPageViews",addToCarts:"addToCarts",checkoutVisits:"checkouts",ordersCompleted:"transactions"}});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"GA4 backfill failed"},{status:(error as Error&{status?:number}).status??500})}
}
