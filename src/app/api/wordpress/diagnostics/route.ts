import {NextResponse} from "next/server";

const site=(process.env.WOOCOMMERCE_URL||"https://laughingmoosegifts.com").replace(/\/$/,"");
const username=process.env.WORDPRESS_USERNAME||"";
const appPassword=(process.env.WORDPRESS_APPLICATION_PASSWORD||"").replace(/\s+/g,"");

function authHeader(){return `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;}

async function wp(path:string,init:RequestInit={}){
  const response=await fetch(`${site}/wp-json${path}`,{...init,headers:{Authorization:authHeader(),Accept:"application/json",...(init.headers||{})},cache:"no-store"});
  const text=await response.text();
  let body:any;try{body=JSON.parse(text);}catch{body=text.slice(0,1000);}
  return {ok:response.ok,status:response.status,body};
}

export async function GET(){
  if(!username||!appPassword)return NextResponse.json({ok:false,error:"WORDPRESS_USERNAME or WORDPRESS_APPLICATION_PASSWORD is not configured."},{status:500});
  const me=await wp("/wp/v2/users/me?context=edit");
  if(!me.ok)return NextResponse.json({ok:false,stage:"authentication",status:me.status,error:me.body},{status:502});
  const settings=await wp("/wp/v2/settings");
  const homepageId=settings.ok?Number(settings.body?.page_on_front||0):0;
  let homepage:any=null;
  if(homepageId){
    const page=await wp(`/wp/v2/pages/${homepageId}?context=edit`);
    homepage=page.ok?{
      id:page.body.id,
      slug:page.body.slug,
      title:page.body.title?.rendered||page.body.title?.raw||"",
      link:page.body.link,
      status:page.body.status,
      contentRaw:page.body.content?.raw||"",
      contentRendered:page.body.content?.rendered||"",
    }:{error:page.body,status:page.status};
  }
  return NextResponse.json({ok:true,user:{id:me.body.id,name:me.body.name,roles:me.body.roles,capabilities:me.body.capabilities},settings:settings.ok?{show_on_front:settings.body?.show_on_front,page_on_front:settings.body?.page_on_front,page_for_posts:settings.body?.page_for_posts}:null,homepage});
}
