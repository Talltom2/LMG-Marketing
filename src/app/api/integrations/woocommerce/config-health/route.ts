import { NextResponse } from "next/server";
import { getWooConfigHealth } from "@/lib/integrations/woocommerce/config-health";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(await getWooConfigHealth());}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to inspect WooCommerce configuration."},{status:500});}}
