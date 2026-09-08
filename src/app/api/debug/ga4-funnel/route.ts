import {NextResponse} from "next/server";
import {fetchGa4FunnelSummary,ga4ConfigStatus} from "@/lib/ga4";

export const dynamic="force-dynamic";

export async function GET(){
  const end=new Date();
  end.setUTCDate(end.getUTCDate()-1);
  const start=new Date(end);
  start.setUTCDate(start.getUTCDate()-6);
  const startDate=start.toISOString().slice(0,10);
  const endDate=end.toISOString().slice(0,10);
  try{
    const summary=await fetchGa4FunnelSummary(startDate,endDate);
    return NextResponse.json({ok:true,startDate,endDate,config:ga4ConfigStatus(),summary});
  }catch(error){
    return NextResponse.json({ok:false,startDate,endDate,config:ga4ConfigStatus(),error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
