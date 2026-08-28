import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";

const STATE_PREFIX="LMG_BUILDER_STATE:";

type BuilderState=Record<string,unknown>&{
  headline?:string;
  cta?:string;
  coreMessage?:string;
  messagingApproved?:boolean;
};

function parseState(theme:string|null):BuilderState{
  if(!theme?.startsWith(STATE_PREFIX))return{};
  try{return JSON.parse(theme.slice(STATE_PREFIX.length)) as BuilderState}catch{return{}};
}

export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;
    const campaign=await db.campaign.findUnique({where:{id},select:{id:true,name:true,objective:true,theme:true,status:true}});
    if(!campaign)return NextResponse.json({error:"Campaign not found."},{status:404});
    const state=parseState(campaign.theme);
    const hasMessaging=Object.prototype.hasOwnProperty.call(state,"headline")||Object.prototype.hasOwnProperty.call(state,"cta")||Object.prototype.hasOwnProperty.call(state,"coreMessage");
    return NextResponse.json({
      campaignId:campaign.id,
      campaignName:campaign.name,
      status:campaign.status,
      hasMessaging,
      messaging:{
        headline:typeof state.headline==="string"?state.headline:"",
        cta:typeof state.cta==="string"?state.cta:"",
        coreMessage:typeof state.coreMessage==="string"?state.coreMessage:"",
        objective:campaign.objective??""
      }
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load campaign messaging."},{status:500});
  }
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;
    const body=await request.json() as Record<string,unknown>;
    const headline=String(body.headline??"");
    const cta=String(body.cta??"");
    const coreMessage=String(body.coreMessage??"");
    const objective=String(body.objective??"");

    const existing=await db.campaign.findUnique({where:{id},select:{id:true,theme:true}});
    if(!existing)return NextResponse.json({error:"Campaign not found."},{status:404});

    const state=parseState(existing.theme);
    const merged:BuilderState={...state,headline,cta,coreMessage,messagingApproved:true};
    const campaign=await db.campaign.update({
      where:{id},
      data:{objective:objective||null,theme:STATE_PREFIX+JSON.stringify(merged)},
      select:{id:true,name:true,objective:true,status:true,updatedAt:true}
    });

    return NextResponse.json({saved:true,campaign,messaging:{headline,cta,coreMessage,objective}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save campaign messaging."},{status:500});
  }
}
