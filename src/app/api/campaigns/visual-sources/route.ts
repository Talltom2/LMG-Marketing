import { NextRequest, NextResponse } from "next/server";
import { wooRequest, wooStoreRequest, woocommerceConfigured } from "@/lib/integrations/woocommerce/client";

type ImageRef={src:string;alt?:string;name?:string};
type AdminProduct={sku?:string;name:string;images?:ImageRef[]};
type StoreProduct={sku?:string;name:string;images?:ImageRef[]};

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
  try{
    const skus=(request.nextUrl.searchParams.get("skus")??"").split(",").map(v=>v.trim()).filter(Boolean);
    if(!skus.length)return NextResponse.json({products:[]});
    const wanted=new Set(skus.map(s=>s.toLowerCase()));
    const products:Array<{sku:string;name:string;imageUrl:string|null;galleryUrls:string[]}>=[];

    if(woocommerceConfigured()){
      for(let page=1;page<=100;page++){
        const rows=await wooRequest<AdminProduct[]>("/products",{per_page:100,page,status:"publish"});
        for(const p of rows){const sku=String(p.sku??"").trim();if(!wanted.has(sku.toLowerCase()))continue;const urls=(p.images??[]).map(i=>i.src).filter(Boolean);products.push({sku,name:p.name,imageUrl:urls[0]??null,galleryUrls:urls.slice(1)});}
        if(rows.length<100||products.length>=wanted.size)break;
      }
    }else{
      for(let page=1;page<=100;page++){
        const rows=await wooStoreRequest<StoreProduct[]>("/products",{per_page:100,page});
        for(const p of rows){const sku=String(p.sku??"").trim();if(!wanted.has(sku.toLowerCase()))continue;const urls=(p.images??[]).map(i=>i.src).filter(Boolean);products.push({sku,name:p.name,imageUrl:urls[0]??null,galleryUrls:urls.slice(1)});}
        if(rows.length<100||products.length>=wanted.size)break;
      }
    }
    return NextResponse.json({products,requested:skus.length,resolved:products.length});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to load campaign visual sources"},{status:500});}
}
