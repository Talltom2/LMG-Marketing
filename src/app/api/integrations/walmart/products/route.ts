import {NextResponse} from "next/server";
import {getWalmartActiveProductHealth} from "@/lib/integrations/walmart/product-list";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(await getWalmartActiveProductHealth());}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to load Walmart products."},{status:502});}}
