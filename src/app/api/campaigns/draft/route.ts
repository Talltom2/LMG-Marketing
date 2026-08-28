import {CampaignStatus} from "@prisma/client";
import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getWebsiteProductHealth} from "@/lib/integrations/woocommerce/product-health";

const STATE_PREFIX="LMG_BUILDER_STATE:";

type BuilderState={
  templateName?:string;
  productSkus?:string[];
  activeAssets?:string[];
  opportunities?:Record<string,string[]>;
  headline?:string;
  cta?:string;
  coreMessage?:string;
};

function parseDate(value:unknown,fallback:Date){
  const d=new Date(String(value||""));
  return Number.isNaN(d.getTime())?fallback:d;
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json() as Record<string,unknown>;
    const campaignId=String(body.campaignId||"").trim();
    const name=String(body.name||"").trim();
    const objective=String(body.objective||"").trim();
    const state=(body.state&&typeof body.state==="object"?body.state:{}) as BuilderState;
    if(!name)return NextResponse.json({error:"Give the campaign a name before saving the draft."},{status:400});

    const now=new Date();
    const defaultStart=new Date(now); defaultStart.setDate(defaultStart.getDate()+8);
    const defaultEnd=new Date(defaultStart); defaultEnd.setDate(defaultEnd.getDate()+14);
    const startDate=parseDate(body.startDate,defaultStart);
    const endDate=parseDate(body.endDate,defaultEnd);
    if(endDate<startDate)return NextResponse.json({error:"Campaign end date must be on or after the start date."},{status:400});

    const existing=campaignId?await db.campaign.findUnique({where:{id:campaignId}}):null;
    if(existing&&(existing.status===CampaignStatus.PLANNED||existing.status===CampaignStatus.ACTIVE)){
      return NextResponse.json({error:"Planned and active campaigns are protected from draft autosave. Use an explicit campaign update workflow instead."},{status:409});
    }

    const productSkus=Array.isArray(state.productSkus)?state.productSkus.map(String).map(s=>s.trim()).filter(Boolean):[];
    let products=productSkus.length?await db.product.findMany({where:{sku:{in:productSkus},active:true}}):[];
    if(productSkus.length&&products.length<productSkus.length){
      const website=await getWebsiteProductHealth();
      const bySku=new Map(website.products.filter(p=>String(p.sku??"").trim()).map(p=>[String(p.sku).trim(),p]));
      const existingSkus=new Set(products.map(p=>p.sku));
      for(const sku of productSkus.filter(s=>!existingSkus.has(s))){
        const p=bySku.get(sku); if(!p)continue;
        await db.product.upsert({where:{sku},update:{name:p.name,active:true},create:{sku,name:p.name,active:true}});
      }
      products=await db.product.findMany({where:{sku:{in:productSkus},active:true}});
    }

    const theme=STATE_PREFIX+JSON.stringify(state);
    const campaign=await db.$transaction(async tx=>{
      const saved=existing
        ?await tx.campaign.update({where:{id:campaignId},data:{name,objective:objective||null,startDate,endDate,theme,status:existing.status===CampaignStatus.ACTIVE?CampaignStatus.ACTIVE:existing.status===CampaignStatus.PLANNED?CampaignStatus.PLANNED:CampaignStatus.DRAFT}})
        :await tx.campaign.create({data:{name,objective:objective||null,startDate,endDate,theme,status:CampaignStatus.DRAFT}});
      await tx.campaignProduct.deleteMany({where:{campaignId:saved.id}});
      if(products.length)await tx.campaignProduct.createMany({data:products.map((p,index)=>({campaignId:saved.id,productId:p.id,role:index===0?"HERO":"SUPPORT"}))});
      return tx.campaign.findUnique({where:{id:saved.id},include:{products:{include:{product:{select:{sku:true,name:true}}}},recommendations:{include:{actions:true}}}});
    });
    return NextResponse.json({campaign},{status:existing?200:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save campaign draft."},{status:500});
  }
}

export async function DELETE(request:NextRequest){
  try{
    const body=await request.json() as Record<string,unknown>;
    const campaignId=String(body.campaignId||"").trim();
    if(!campaignId)return NextResponse.json({error:"Campaign id is required."},{status:400});
    const campaign=await db.campaign.findUnique({where:{id:campaignId},select:{id:true,name:true,status:true}});
    if(!campaign)return NextResponse.json({error:"Campaign not found."},{status:404});
    if(campaign.status!==CampaignStatus.DRAFT)return NextResponse.json({error:"Only DRAFT campaigns can be deleted. Planned, active and completed campaign history is retained."},{status:409});
    await db.campaign.delete({where:{id:campaignId}});
    return NextResponse.json({deleted:true,campaign});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to delete campaign draft."},{status:500});
  }
}
