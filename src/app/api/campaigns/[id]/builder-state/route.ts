import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";

const STATE_PREFIX="LMG_BUILDER_STATE:";

type BuilderState=Record<string,unknown>;

function parseState(theme:string|null):BuilderState{
  if(!theme?.startsWith(STATE_PREFIX))return{};
  try{
    const parsed=JSON.parse(theme.slice(STATE_PREFIX.length));
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as BuilderState:{};
  }catch{return{};}
}

function parseOptionalDate(value:unknown){
  if(value===undefined)return undefined;
  const text=String(value??"").trim();
  if(!text)return null;
  const date=new Date(`${text.slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime())?undefined:date;
}

export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;
    const campaign=await db.campaign.findUnique({
      where:{id},
      include:{products:{include:{product:{select:{sku:true,name:true}}}},recommendations:{include:{actions:true}}}
    });
    if(!campaign)return NextResponse.json({error:"Campaign not found."},{status:404});
    return NextResponse.json({campaign,state:parseState(campaign.theme)});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load builder state."},{status:500});
  }
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;
    const body=await request.json() as Record<string,unknown>;
    const existing=await db.campaign.findUnique({where:{id},select:{id:true,name:true,objective:true,startDate:true,endDate:true,theme:true,status:true}});
    if(!existing)return NextResponse.json({error:"Campaign not found."},{status:404});

    const incoming=body.state&&typeof body.state==="object"&&!Array.isArray(body.state)?body.state as BuilderState:{};
    const mergedState={...parseState(existing.theme),...incoming};
    const name=body.name===undefined?undefined:String(body.name??"").trim();
    const objective=body.objective===undefined?undefined:String(body.objective??"");
    const startDate=parseOptionalDate(body.startDate);
    const endDate=parseOptionalDate(body.endDate);

    const nextStart=startDate instanceof Date?startDate:existing.startDate;
    const nextEnd=endDate instanceof Date?endDate:existing.endDate;
    if(nextEnd<nextStart)return NextResponse.json({error:"Campaign end date must be on or after the start date."},{status:400});

    const campaign=await db.campaign.update({
      where:{id},
      data:{
        ...(name!==undefined&&name?{name}:{}),
        ...(objective!==undefined?{objective:objective.trim()?objective:null}:{}),
        ...(startDate instanceof Date?{startDate}:{}),
        ...(endDate instanceof Date?{endDate}:{}),
        theme:STATE_PREFIX+JSON.stringify(mergedState)
      },
      include:{products:{include:{product:{select:{sku:true,name:true}}}},recommendations:{include:{actions:true}}}
    });

    return NextResponse.json({saved:true,campaign,state:mergedState});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save builder state."},{status:500});
  }
}
