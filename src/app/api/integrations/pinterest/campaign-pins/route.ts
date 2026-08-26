import {NextResponse} from "next/server";
import {pinterestConfigured} from "@/lib/integrations/pinterest/client";
import {previewPinterestCampaignPins,publishPinterestCampaignPins,type PinterestCampaignPinInput} from "@/lib/integrations/pinterest/board-manager";

export const dynamic="force-dynamic";

type Body={
  action?:"preview"|"publish";
  boardId?:string;
  productSkus?:string[];
  campaignName?:string;
  headline?:string;
  description?:string;
  cta?:string;
  opportunityId?:string;
};

function inputsFrom(body:Body):PinterestCampaignPinInput[]{
  const boardId=String(body.boardId??"").trim();
  const skus=Array.isArray(body.productSkus)?body.productSkus.map(String).map(s=>s.trim()).filter(Boolean):[];
  if(!boardId)throw new Error("Choose a Pinterest board first.");
  if(!skus.length)throw new Error("Select at least one campaign product first.");
  return skus.map(sku=>({boardId,sku,campaignName:body.campaignName,headline:body.headline,description:body.description,cta:body.cta,opportunityId:body.opportunityId}));
}

export async function GET(){
  return NextResponse.json({configured:pinterestConfigured(),supported:["organic-product-pins","seasonal-board","inspiration-content"],gated:["paid-pinterest","retargeting"]});
}

export async function POST(req:Request){
  try{
    const body=await req.json() as Body;
    const action=body.action??"preview";
    const inputs=inputsFrom(body);
    if(action==="publish"){
      if(!pinterestConfigured())return NextResponse.json({message:"Pinterest API access is not connected yet. Preview is available, but publishing requires a Pinterest token with boards:read and pins:write access."},{status:409});
      const published=await publishPinterestCampaignPins(inputs);
      return NextResponse.json({published:true,count:published.length,items:published});
    }
    const previews=await previewPinterestCampaignPins(inputs);
    return NextResponse.json({published:false,count:previews.length,items:previews});
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:"Unable to prepare Pinterest campaign Pins."},{status:400});
  }
}
