import {ContentApprovalStatus,PublicationStatus} from "@prisma/client";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const body=await req.json();const existing=await db.campaignContentAsset.findUnique({where:{id}});
 if(!existing)return NextResponse.json({error:"Content asset not found"},{status:404});
 const approval=body.approvalStatus===undefined?undefined:String(body.approvalStatus) as ContentApprovalStatus;
 if(approval&&!Object.values(ContentApprovalStatus).includes(approval))return NextResponse.json({error:"Invalid approval status"},{status:400});
 const scheduledAt=body.scheduledAt===undefined?undefined:body.scheduledAt?new Date(String(body.scheduledAt)):null;
 if(scheduledAt instanceof Date&&Number.isNaN(scheduledAt.getTime()))return NextResponse.json({error:"Invalid schedule date"},{status:400});
 if(scheduledAt&&approval!==ContentApprovalStatus.APPROVED&&existing.approvalStatus!==ContentApprovalStatus.APPROVED)return NextResponse.json({error:"Only explicitly approved content can be scheduled."},{status:409});
 const fields=["headline","bodyCopy","cta","destinationUrl","imageReference","notes"] as const;const data:Record<string,unknown>={};for(const field of fields)if(body[field]!==undefined)data[field]=String(body[field]??"").trim()||null;
 if(body.trackingParameters!==undefined)data.trackingParameters=body.trackingParameters;
 if(approval){data.approvalStatus=approval;data.approvedAt=approval===ContentApprovalStatus.APPROVED?new Date():null;if(approval!==ContentApprovalStatus.APPROVED){data.scheduledAt=null;data.publicationStatus=PublicationStatus.UNSCHEDULED}}
 if(scheduledAt!==undefined){data.scheduledAt=scheduledAt;data.publicationStatus=scheduledAt?PublicationStatus.SCHEDULED:PublicationStatus.UNSCHEDULED}
 if(body.recordPublication===true){const note=String(body.confirmationNote??"").trim();if(!note)return NextResponse.json({error:"A manual publication confirmation note is required."},{status:400});if(existing.approvalStatus!==ContentApprovalStatus.APPROVED&&approval!==ContentApprovalStatus.APPROVED)return NextResponse.json({error:"Unapproved content cannot be recorded as published."},{status:409});data.publicationStatus=PublicationStatus.PUBLISHED;data.publishedAt=new Date();data.adapter="MANUAL_USER_CONFIRMATION";data.adapterConfirmation={confirmedBy:"USER",note,confirmedAt:new Date().toISOString()};}
 const asset=await db.campaignContentAsset.update({where:{id},data});return NextResponse.json({asset});
}
