import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";

export const dynamic="force-dynamic";

type ConnectionField={key:string;label:string;secret?:boolean};
type AssetConnection={asset:string;label:string;fields:ConnectionField[]};

const LIBRARY_KEY="default";
const connections:AssetConnection[]=[
  {asset:"WEBSITE_HOMEPAGE",label:"Website Homepage",fields:[{key:"WOOCOMMERCE_URL",label:"Website URL"}]},
  {asset:"WOOCOMMERCE",label:"WooCommerce Store",fields:[{key:"WOOCOMMERCE_URL",label:"Store URL"},{key:"WOOCOMMERCE_CONSUMER_KEY",label:"Consumer Key",secret:true},{key:"WOOCOMMERCE_CONSUMER_SECRET",label:"Consumer Secret",secret:true}]},
  {asset:"PINTEREST",label:"Pinterest",fields:[{key:"PINTEREST_ACCESS_TOKEN",label:"Access Token",secret:true}]},
  {asset:"TIKTOK",label:"TikTok",fields:[{key:"TIKTOK_ACCESS_TOKEN",label:"Access Token",secret:true},{key:"TIKTOK_ADVERTISER_ID",label:"Advertiser ID"},{key:"TIKTOK_PIXEL_ID",label:"Pixel ID"},{key:"TIKTOK_EVENTS_ACCESS_TOKEN",label:"Events Access Token",secret:true},{key:"TIKTOK_CATALOG_ID",label:"Catalog ID"},{key:"TIKTOK_SHOP_ID",label:"Shop ID"}]},
  {asset:"META",label:"Facebook / Instagram",fields:[]},
  {asset:"BING",label:"Bing / Microsoft Ads",fields:[]},
  {asset:"WALMART_MARKETPLACE",label:"Walmart Marketplace",fields:[{key:"WALMART_CLIENT_ID",label:"Client ID"},{key:"WALMART_CLIENT_SECRET",label:"Client Secret",secret:true}]},
  {asset:"WALMART_ADS",label:"Walmart Connect Ads",fields:[]},
  {asset:"AMAZON_US",label:"Amazon US Marketplace",fields:[]},
  {asset:"AMAZON_ADS",label:"Amazon Ads",fields:[]},
  {asset:"AMAZON_CA",label:"Amazon Canada Marketplace",fields:[]},
  {asset:"EMAIL",label:"Email",fields:[]},
];

function fieldStatus(field:ConnectionField){
  const value=process.env[field.key]?.trim()??"";
  return {key:field.key,label:field.label,secret:!!field.secret,configured:!!value,display:field.secret?(value?"•••••••• configured":"Not configured"):(value||"Not configured")};
}

async function readLibrary(){
  const rows=await db.$queryRawUnsafe<Array<{data:unknown;updatedAt:Date}>>(
    `SELECT "data", "updatedAt" FROM "PromotionalAssetLibrary" WHERE "key"=$1 LIMIT 1`,LIBRARY_KEY
  );
  return rows[0]??null;
}

export async function GET(){
  try{
    const [stored]=await Promise.all([readLibrary()]);
    const assets=connections.map(connection=>{
      const fields=connection.fields.map(fieldStatus);
      return {...connection,fields,configured:fields.length>0&&fields.every(f=>f.configured),partial:fields.some(f=>f.configured)&&!fields.every(f=>f.configured)};
    });
    return NextResponse.json({assets,library:stored?.data??null,updatedAt:stored?.updatedAt??null,securityNote:"Secret values are never returned by this endpoint. Replace secrets in deployment environment settings."});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to load promotional asset library."},{status:500});
  }
}

export async function PUT(request:NextRequest){
  try{
    const body=await request.json() as {library?:unknown};
    if(!body.library||typeof body.library!=="object")return NextResponse.json({error:"A promotional asset library object is required."},{status:400});
    const json=JSON.stringify(body.library);
    await db.$executeRawUnsafe(
      `INSERT INTO "PromotionalAssetLibrary" ("key","data","updatedAt") VALUES ($1,$2::jsonb,now()) ON CONFLICT ("key") DO UPDATE SET "data"=EXCLUDED."data", "updatedAt"=now()`,
      LIBRARY_KEY,json
    );
    const stored=await readLibrary();
    return NextResponse.json({ok:true,updatedAt:stored?.updatedAt??new Date()});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save promotional asset library."},{status:500});
  }
}
