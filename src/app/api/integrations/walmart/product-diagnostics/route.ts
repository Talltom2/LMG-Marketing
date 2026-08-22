import { NextRequest,NextResponse } from "next/server";
import { diagnoseWalmartProduct } from "@/lib/integrations/walmart/product-diagnostics";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const sku=request.nextUrl.searchParams.get("sku")??"";return NextResponse.json(await diagnoseWalmartProduct(sku));}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to diagnose Walmart product."},{status:400});}}
