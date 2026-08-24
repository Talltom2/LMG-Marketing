import {NextResponse} from "next/server";

export const dynamic="force-dynamic";

type ConnectionField={key:string;label:string;secret?:boolean};
type AssetConnection={asset:string;label:string;fields:ConnectionField[]};

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

export async function GET(){
  const assets=connections.map(connection=>{
    const fields=connection.fields.map(fieldStatus);
    return {...connection,fields,configured:fields.length>0&&fields.every(f=>f.configured),partial:fields.some(f=>f.configured)&&!fields.every(f=>f.configured)};
  });
  return NextResponse.json({assets,securityNote:"Secret values are never returned by this endpoint. Replace secrets in deployment environment settings."});
}
