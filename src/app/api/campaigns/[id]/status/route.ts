import { CampaignStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const body=await request.json();
    const status=String(body.status||"").toUpperCase() as CampaignStatus;
    if(!Object.values(CampaignStatus).includes(status))return NextResponse.json({error:"Invalid campaign status."},{status:400});
    const campaign=await db.campaign.update({where:{id},data:{status},include:{products:{include:{product:{select:{sku:true,name:true}}}},recommendations:{include:{actions:true}}}});
    return NextResponse.json({campaign});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to update campaign status."},{status:500});
  }
}
