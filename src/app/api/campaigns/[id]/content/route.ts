import {ContentApprovalStatus,Prisma,PublicationStatus} from "@prisma/client";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {importedContentState} from "@/lib/content-lifecycle";

const clean=(value:unknown)=>{const text=String(value??"").trim();return text||null};

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const assets=await db.campaignContentAsset.findMany({where:{campaignId:id},orderBy:[{channel:"asc"},{deliverable:"asc"}]});
 return NextResponse.json({assets});
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const body=await req.json();
 const channel=String(body.channel??"").trim(),deliverable=String(body.deliverable??"").trim();
 if(!channel||!deliverable)return NextResponse.json({error:"Channel and deliverable are required."},{status:400});
 const campaign=await db.campaign.findUnique({where:{id},select:{id:true}});if(!campaign)return NextResponse.json({error:"Campaign not found"},{status:404});
 const initial=importedContentState();const data={headline:clean(body.headline),bodyCopy:clean(body.bodyCopy),cta:clean(body.cta),destinationUrl:clean(body.destinationUrl),imageReference:clean(body.imageReference),notes:clean(body.notes),trackingParameters:body.trackingParameters&&typeof body.trackingParameters==="object"?body.trackingParameters:Prisma.DbNull,approvalStatus:ContentApprovalStatus.DRAFT,approvedAt:initial.approvedAt,publicationStatus:PublicationStatus.UNSCHEDULED,scheduledAt:initial.scheduledAt,publishedAt:initial.publishedAt,adapterConfirmation:Prisma.DbNull};
 const asset=await db.campaignContentAsset.upsert({where:{campaignId_channel_deliverable:{campaignId:id,channel,deliverable}},create:{campaignId:id,channel,deliverable,...data},update:data});
 await db.campaign.update({where:{id},data:{workflowStage:"CONTENT_IMPORT"}});
 return NextResponse.json({asset,notice:"Imported content remains DRAFT until explicitly reviewed and approved."},{status:201});
}
