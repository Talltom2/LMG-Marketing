import {NextRequest,NextResponse} from "next/server";
import {diagnoseWebsiteProduct} from "@/lib/integrations/woocommerce/product-health";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const sku=request.nextUrl.searchParams.get("sku")??"";return NextResponse.json(await diagnoseWebsiteProduct(sku));}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to diagnose website product."},{status:400});}}
