import {NextResponse} from "next/server";
import {getPinterestCatalogHealth} from "@/lib/integrations/pinterest/catalog-health";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(await getPinterestCatalogHealth());}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to load Pinterest catalog health."},{status:500});}}
