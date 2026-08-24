import {NextResponse} from "next/server";

const site=(process.env.WOOCOMMERCE_URL||"https://laughingmoosegifts.com").replace(/\/$/,"");
const username=process.env.WORDPRESS_USERNAME||"";
const appPassword=(process.env.WORDPRESS_APPLICATION_PASSWORD||"").replace(/\s+/g,"");

function authHeader(){return `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;}
async function wp(path:string){
  const response=await fetch(`${site}/wp-json${path}`,{headers:{Authorization:authHeader(),Accept:"application/json"},cache:"no-store"});
  const text=await response.text();let body:any;try{body=JSON.parse(text);}catch{body=null;}
  return {ok:response.ok,status:response.status,body};
}
function blockSummary(raw:string){
  const names=[...raw.matchAll(/<!--\s+wp:([^\s{]+)[^>]*-->/g)].map(m=>m[1]);
  const counts:Record<string,number>={};for(const name of names)counts[name]=(counts[name]||0)+1;
  const candidateTerms=["kadence","rowlayout","advancedheading","buttons","image","cover","hero"];
  const lower=raw.toLowerCase();
  return {blockCount:names.length,blockTypes:counts,candidateTerms:Object.fromEntries(candidateTerms.map(term=>[term,lower.includes(term)]))};
}
export async function GET(){
  if(!username||!appPassword)return NextResponse.json({ok:false,configured:false,error:"WordPress credentials are not configured."},{status:500});
  const me=await wp("/wp/v2/users/me?context=edit");
  if(!me.ok)return NextResponse.json({ok:false,configured:true,authenticated:false,stage:"authentication",wordpressStatus:me.status},{status:502});
  const settings=await wp("/wp/v2/settings");
  const homepageId=settings.ok?Number(settings.body?.page_on_front||0):0;
  let homepage:any=null;
  if(homepageId){
    const page=await wp(`/wp/v2/pages/${homepageId}?context=edit`);
    if(page.ok){const raw=page.body.content?.raw||"";homepage={id:page.body.id,slug:page.body.slug,title:page.body.title?.rendered||page.body.title?.raw||"",status:page.body.status,structure:blockSummary(raw)};}
    else homepage={id:homepageId,readable:false,wordpressStatus:page.status};
  }
  return NextResponse.json({ok:true,configured:true,authenticated:true,user:{id:me.body.id,roles:me.body.roles},settings:settings.ok?{show_on_front:settings.body?.show_on_front,page_on_front:settings.body?.page_on_front}:null,homepage,diagnosticVersion:3});
}
