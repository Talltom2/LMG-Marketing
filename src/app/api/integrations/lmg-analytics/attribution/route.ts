import { NextResponse } from "next/server";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const SOURCES=["pinterest","tiktok","instagram","facebook","bing","google","organic","direct","email","referral"];
const label=(s:string)=>({pinterest:"Pinterest",tiktok:"TikTok",instagram:"Instagram",facebook:"Facebook",bing:"Bing / Microsoft",google:"Google",organic:"Organic Search",direct:"Direct",email:"Email",referral:"Referral"}[s]??s.replace(/(^|-)([a-z])/g,(_,a,b)=>`${a?" ":""}${b.toUpperCase()}`));

export async function GET(){
 try{
  const channel=await db.channel.findFirst({where:{type:ChannelType.WOOCOMMERCE,name:"Laughing Moose Gifts Website"}});
  if(!channel)return NextResponse.json({sources:[],message:"Website channel not found."});
  const since=new Date();since.setUTCDate(since.getUTCDate()-7);
  const rows=await db.funnelMetric.findMany({where:{channelId:channel.id,date:{gte:since},source:{startsWith:"lmg-analytics:"}}});
  const grouped=new Map<string,{sessions:number;productViews:number;addToCarts:number;checkoutStarts:number;purchases:number;revenue:number}>();
  for(const r of rows){const key=r.source.replace(/^lmg-analytics:/,"")||"other";const g=grouped.get(key)??{sessions:0,productViews:0,addToCarts:0,checkoutStarts:0,purchases:0,revenue:0};g.sessions+=r.sessions;g.productViews+=r.productViews;g.addToCarts+=r.addToCarts;g.checkoutStarts+=r.checkoutStarts;g.purchases+=r.purchases;g.revenue+=Number(r.revenue);grouped.set(key,g);}
  for(const s of SOURCES)if(!grouped.has(s))grouped.set(s,{sessions:0,productViews:0,addToCarts:0,checkoutStarts:0,purchases:0,revenue:0});
  const sources=[...grouped.entries()].map(([source,g])=>{const conversion=g.sessions?g.purchases/g.sessions:null;const cartRate=g.productViews?g.addToCarts/g.productViews:null;const checkoutRate=g.addToCarts?g.checkoutStarts/g.addToCarts:null;const checkoutCompletion=g.checkoutStarts?g.purchases/g.checkoutStarts:null;const revenuePerSession=g.sessions?g.revenue/g.sessions:null;let health:"GREEN"|"YELLOW"|"RED"="YELLOW";let diagnosis="No recent attributed traffic.";if(g.sessions>=20&&g.purchases===0){health="RED";diagnosis="Traffic is arriving but has produced no purchases.";}else if(g.sessions>=20&&conversion!=null&&conversion<0.01){health="RED";diagnosis="Traffic volume is meaningful but conversion is below 1%.";}else if(g.sessions>=10&&conversion!=null&&conversion>=0.02){health="GREEN";diagnosis="Traffic is converting at 2% or better.";}else if(g.sessions>0){health="YELLOW";diagnosis="Some traffic is present; more volume or stronger conversion is needed.";}return{source,label:label(source),health,diagnosis,...g,conversion,cartRate,checkoutRate,checkoutCompletion,revenuePerSession};}).sort((a,b)=>b.revenue-a.revenue||b.sessions-a.sessions);
  return NextResponse.json({windowDays:7,sources});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Unable to load attribution diagnostics."},{status:500});}
}
