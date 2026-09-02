import {NextRequest,NextResponse} from "next/server";
import {syncGa4FunnelIfStale} from "@/lib/sync-ga4-funnel";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const ua=req.headers.get("user-agent")||"";
  const internal=req.headers.get("x-lmg-internal");
  if(!ua.includes("vercel-cron")&&internal!==process.env.LMG_INTERNAL_SYNC_SECRET){
    return NextResponse.json({error:"Not authorized"},{status:401});
  }
  try{
    const result=await syncGa4FunnelIfStale(true);
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Funnel sync failed"},{status:500});
  }
}
