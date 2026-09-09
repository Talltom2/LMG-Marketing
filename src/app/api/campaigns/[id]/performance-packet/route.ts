import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCampaignMetrics} from "@/lib/campaign-metrics";
import {buildPerformancePacket} from "@/lib/campaign-packets";

const pctDelta=(current:number,baseline:number)=>baseline?((current-baseline)/baseline)*100:null;

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const metrics=await getCampaignMetrics(id);if(!metrics)return NextResponse.json({error:"Campaign not found"},{status:404});
 const [syncs,assets,actions]=await Promise.all([
  db.syncRun.findMany({orderBy:{startedAt:"desc"},take:20}),
  db.campaignContentAsset.findMany({where:{campaignId:id}}),
  db.campaignFollowUpAction.findMany({where:{campaignId:id},orderBy:{createdAt:"desc"}}),
 ]);
 const latest=new Map<string,typeof syncs[number]>();for(const run of syncs)if(!latest.has(run.source))latest.set(run.source,run);
 const dataHealth:Array<Record<string,unknown>>=[];
 for(const run of latest.values()){if(run.status!=="COMPLETED")dataHealth.push({type:"SYNC",severity:"ERROR",title:`${run.source} sync is ${run.status}`,detail:run.errorMessage||"The latest sync did not complete."});else if(Date.now()-run.startedAt.getTime()>2*86400000)dataHealth.push({type:"SYNC",severity:"WARNING",title:`${run.source} data is stale`,detail:`Last completed sync: ${run.startedAt.toISOString()}`});}
 if(!metrics.summary.sessions)dataHealth.push({type:"ATTRIBUTION",severity:"WARNING",title:"No attributed campaign sessions",detail:"No funnel sessions are available for the campaign measurement window."});
 const scheduled=assets.filter(a=>a.publicationStatus==="SCHEDULED"),published=assets.filter(a=>a.publicationStatus==="PUBLISHED");
 if(scheduled.some(a=>a.scheduledAt&&a.scheduledAt.getTime()<Date.now()))dataHealth.push({type:"PUBLICATION",severity:"WARNING",title:"Scheduled content lacks confirmed publication",detail:"At least one asset is past its scheduled time without adapter or user confirmation."});
 const anomalies:Array<Record<string,unknown>>=[];
 for(const metric of ["revenue","units","sessions","purchases"] as const){const current=metrics.summary[metric],baseline=metrics.baseline[metric],delta=pctDelta(current,baseline);if(delta!=null&&Math.abs(delta)>=20)anomalies.push({metric,current,baseline,deltaPercent:Number(delta.toFixed(1)),direction:delta>0?"UP":"DOWN",title:`${metric} changed ${Math.abs(delta).toFixed(1)}% versus baseline`,evidence:`Current ${current}; baseline ${baseline}.`});}
 const packet=buildPerformancePacket({campaign:{...metrics.campaign,measurementWindow:metrics.window,publication:{assets:assets.length,scheduled:scheduled.length,published:published.length}},summary:metrics.summary,baseline:metrics.baseline,channels:metrics.channels,products:metrics.products,dataHealth,factualAnomalies:anomalies,priorActions:actions});
 return NextResponse.json(packet);
}
