import {NextResponse} from "next/server";
import {getWebsiteProductHealth} from "@/lib/integrations/woocommerce/product-health";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(await getWebsiteProductHealth());}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to load website product health."},{status:500});}}
