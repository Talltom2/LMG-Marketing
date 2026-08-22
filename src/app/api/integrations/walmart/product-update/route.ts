import {NextRequest,NextResponse} from "next/server";
import {walmartRequest} from "@/lib/integrations/walmart/client";

export const dynamic="force-dynamic";

type Action="PRICE"|"INVENTORY"|"NAME";

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const sku=String(body?.sku??"").trim();
    const action=String(body?.action??"").toUpperCase() as Action;
    if(!sku)return NextResponse.json({message:"SKU is required."},{status:400});

    if(action==="PRICE"){
      const price=Number(body?.price);
      if(!Number.isFinite(price)||price<=0)return NextResponse.json({message:"Enter a valid price greater than zero."},{status:400});
      const result=await walmartRequest<any>("/v3/price",{
        method:"PUT",
        body:JSON.stringify({sku,pricing:[{currentPriceType:"BASE",currentPrice:{currency:"USD",amount:Number(price.toFixed(2))}}]})
      });
      return NextResponse.json({ok:true,message:`Walmart accepted the price update for ${sku}. Allow up to several minutes for the marketplace to reflect it.`,result});
    }

    if(action==="INVENTORY"){
      const quantity=Number(body?.quantity);
      if(!Number.isInteger(quantity)||quantity<0)return NextResponse.json({message:"Inventory must be a whole number of 0 or greater."},{status:400});
      const result=await walmartRequest<any>(`/v3/inventory?sku=${encodeURIComponent(sku)}`,{
        method:"PUT",
        body:JSON.stringify({sku,quantity:{unit:"EACH",amount:quantity}})
      });
      return NextResponse.json({ok:true,message:`Walmart accepted the inventory update for ${sku}. The new quantity submitted is ${quantity}.`,result});
    }

    if(action==="NAME"){
      return NextResponse.json({ok:false,supported:false,message:"Walmart does not provide a simple single-item title/name update endpoint. Product names are maintained through an MP_MAINTENANCE item feed, which requires the current item specification and product identifiers. LMG Marketing is not sending that feed automatically yet because an incorrect maintenance payload can overwrite catalog attributes. Price and inventory can be updated safely here now."},{status:409});
    }

    return NextResponse.json({message:"Unsupported product update action."},{status:400});
  }catch(error){
    return NextResponse.json({message:error instanceof Error?error.message:"Unable to update Walmart product."},{status:502});
  }
}
