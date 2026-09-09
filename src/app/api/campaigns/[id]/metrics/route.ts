import {NextResponse} from "next/server";
import {getCampaignMetrics} from "@/lib/campaign-metrics";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const metrics=await getCampaignMetrics(id);
 if(!metrics)return NextResponse.json({error:"Campaign not found"},{status:404});
 return NextResponse.json(metrics);
}
