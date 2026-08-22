import {NextResponse} from "next/server";
import {db} from "@/lib/db";

export async function POST(request:Request){
 try{
  const body=await request.json();
  const sku=String(body?.sku??"").trim();
  const name=String(body?.name??sku).trim();
  const action=String(body?.action??"").toUpperCase();
  const note=String(body?.note??"").trim();
  if(!sku||!["REORDER","RETIRE","DELETE"].includes(action))return NextResponse.json({message:"Invalid product action."},{status:400});
  const product=await db.product.findUnique({where:{sku}}).catch(()=>null);
  const title=action==="REORDER"?`Reorder inventory for ${sku}`:action==="RETIRE"?`Retire Walmart product ${sku}`:`Delete Walmart product ${sku}`;
  const observation=`Walmart SKU ${sku} (${name}) has zero available inventory.`;
  const recommendation=action==="REORDER"?(note||"Order replacement inventory and record the expected replenishment timing."):action==="RETIRE"?"Retire this product from active Walmart marketing and marketplace operations after confirming no remaining fulfillment obligations.":"Remove this product from Walmart only after confirming deletion is intended and no inventory, orders, returns, or catalog dependencies remain.";
  const risk=action==="DELETE"?"HIGH":action==="RETIRE"?"MODERATE":"LOW";
  const rec=await db.recommendation.create({data:{title,observation,recommendation,rationale:`User-approved Walmart product-management action. Risk: ${risk}. ${note?`Note: ${note}`:""}`,expectedImpact:action==="REORDER"?"Restore sellable inventory and revenue opportunity.":action==="RETIRE"?"Stop treating this SKU as an active growth opportunity.":"Remove an intentionally discontinued Walmart listing after safe execution.",status:"APPROVED",priority:action==="REORDER"?2:3,productId:product?.id,decidedAt:new Date(),actions:{create:{actionType:`WALMART_PRODUCT_${action}`,description:recommendation,executionTarget:`Walmart:${sku}`}}}}});
  return NextResponse.json({queued:true,recommendationId:rec.id,message:action==="REORDER"?"Reorder note saved and action queued.":`${action==="RETIRE"?"Retirement":"Deletion"} approved and queued. Walmart will not be reported as changed until execution is confirmed.`});
 }catch(error){console.error("Walmart product action failed",error);return NextResponse.json({message:"Unable to save the Walmart product action."},{status:500});}
}
