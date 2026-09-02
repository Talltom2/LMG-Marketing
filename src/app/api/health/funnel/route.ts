import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {ga4ConfigStatus} from "@/lib/ga4";

export const dynamic="force-dynamic";

export async function GET(){
  const since=new Date(Date.now()-10*86400000);
  const [latestRun,rows]=await Promise.all([
    db.syncRun.findFirst({where:{source:"ga4-funnel-live"},orderBy:{startedAt:"desc"},select:{status:true,startedAt:true,completedAt:true,recordsRead:true,recordsSaved:true,errorMessage:true}}),
    db.funnelMetric.findMany({where:{date:{gte:since},source:{startsWith:"lmg-analytics:"}},select:{date:true,source:true,sessions:true,productViews:true,addToCarts:true,checkoutStarts:true,purchases:true},orderBy:{date:"asc"}}),
  ]);
  return NextResponse.json({configured:ga4ConfigStatus(),latestRun,rows});
}
