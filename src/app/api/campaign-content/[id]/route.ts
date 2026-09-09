import {ContentApprovalStatus,PublicationStatus} from "@prisma/client";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {canRecordPublication,canScheduleContent} from "@/lib/content-lifecycle";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const body=await req.json();const existing=await db.campaignContentAsset.findUnique({where:{id}});
 if(!existing)return NextResponse.json({error:"Content asset not found"},{status:404});
 const approval=body.approvalStatus===undefined?undefined:String(body.approvalStatus) as ContentApprovalStatus;
 if(approval&&!Object.values(ContentApprovalStatus).includes(approval))return NextResponse.json({error:"Invalid approval status"},{status:400});
 const scheduledAt=body.scheduledAt===undefined?undefined:body.scheduledAt?new Date(String(body.scheduledAt)):null;
 if(scheduledAt instanceof Date&&Number.isNaN(scheduledAt.getTime()))return NextResponse.json({error:"Invalid schedule date"},{status:400});
 const effectiveApproval=(approval??existing.approvalStatus) as "DRAFT"|"IN_REVIEW"|"APPROVED"|"REJECTED";if(scheduledAt&&!canScheduleContent(effectiveApproval))return NextResponse.json({error:"Only explicitly approved content can be scheduled."},{status:409});
 if(scheduledAt&&existing.channel==="WOOCOMMERCE"&&!existing.imageReference)return NextResponse.json({error:"Website content needs an approved image reference before scheduling."},{status:409});
 if(scheduledAt&&existing.channel==="WOOCOMMERCE"&&existing.deliverable==="Homepage feature"&&!existing.destinationUrl)return NextResponse.json({error:"The homepage feature needs a destination URL before scheduling."},{status:409});
 if(scheduledAt&&existing.channel==="PINTEREST"){const tracking=existing.trackingParameters&&typeof existing.trackingParameters==="object"&&!Array.isArray(existing.trackingParameters)?existing.trackingParameters as Record<string,unknown>:{};if(!String(tracking.boardId??"").trim())return NextResponse.json({error:"Pinterest content needs trackingParameters.boardId before scheduling."},{status:409});}
 const fields=["headline","bodyCopy","cta","destinationUrl","imageReference","notes"] as const;const data:Record<string,unknown>={};for(const field of fields)if(body[field]!==undefined)data[field]=String(body[field]??"").trim()||null;
 if(body.trackingParameters!==undefined)data.trackingParameters=body.trackingParameters;
 if(approval){data.approvalStatus=approval;data.approvedAt=approval===ContentApprovalStatus.APPROVED?new Date():null;if(approval!==ContentApprovalStatus.APPROVED){data.scheduledAt=null;data.publicationStatus=PublicationStatus.UNSCHEDULED}}
 if(scheduledAt!==undefined){data.scheduledAt=scheduledAt;data.publicationStatus=scheduledAt?PublicationStatus.SCHEDULED:PublicationStatus.UNSCHEDULED}
 if(body.recordPublication===true){const note=String(body.confirmationNote??"").trim();if(!canRecordPublication(effectiveApproval,note))return NextResponse.json({error:note?"Unapproved content cannot be recorded as published.":"A manual publication confirmation note is required."},{status:note?409:400});data.publicationStatus=PublicationStatus.PUBLISHED;data.publishedAt=new Date();data.adapter="MANUAL_USER_CONFIRMATION";data.adapterConfirmation={confirmedBy:"USER",note,confirmedAt:new Date().toISOString()};}
 const asset=await db.campaignContentAsset.update({where:{id},data});return NextResponse.json({asset});
}
