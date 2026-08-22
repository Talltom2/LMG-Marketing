import { NextResponse } from "next/server";
import { walmartRequest } from "@/lib/integrations/walmart/client";
export const dynamic = "force-dynamic";
function summarize(v:any):any { if(Array.isArray(v)) return {type:"array",length:v.length,first:v[0]??null}; if(v&&typeof v==="object") return {type:"object",keys:Object.keys(v),sample:Object.fromEntries(Object.entries(v).slice(0,10).map(([k,val])=>[k,Array.isArray(val)?{type:"array",length:val.length,first:val[0]??null}:val&&typeof val==="object"?{keys:Object.keys(val as any),firstArray:Object.entries(val as any).find(([,x])=>Array.isArray(x))?.[1]??null}:val]))}; return v; }
export async function GET(){ try { const [items,inv]=await Promise.all([walmartRequest<any>("/v3/items?limit=2"),walmartRequest<any>("/v3/inventories?limit=2")]); return NextResponse.json({items:summarize(items),inventories:summarize(inv)}); } catch(e){return NextResponse.json({message:e instanceof Error?e.message:"debug failed"},{status:502});}}
