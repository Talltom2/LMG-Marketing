import {NextResponse} from "next/server";
import {db} from "@/lib/db";
const n=(v:unknown)=>Number(v??0);
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const campaign=await db.campaign.findUnique({where:{id},include:{products:{include:{product:{select:{id:true,sku:true,name:true}}}}}});
 if(!campaign)return NextResponse.json({error:"Campaign not found"},{status:404});
 const productIds=campaign.products.map(p=>p.product.id),start=campaign.startDate,end=new Date(Math.min(campaign.endDate.getTime(),Date.now()));
 const duration=Math.max(1,end.getTime()-start.getTime()),baseEnd=new Date(start.getTime()-1),baseStart=new Date(baseEnd.getTime()-duration);
 const [commerce,funnel,baseCommerce,baseFunnel]=await Promise.all([
  db.commerceMetric.findMany({where:{productId:{in:productIds},date:{gte:start,lte:end}},include:{channel:true,product:true}}),
  db.funnelMetric.findMany({where:{productId:{in:productIds},date:{gte:start,lte:end}},include:{channel:true,product:true}}),
  db.commerceMetric.findMany({where:{productId:{in:productIds},date:{gte:baseStart,lte:baseEnd}}}),
  db.funnelMetric.findMany({where:{productId:{in:productIds},date:{gte:baseStart,lte:baseEnd}}})]);
 const summary={revenue:commerce.reduce((s,m)=>s+n(m.revenue),0),units:commerce.reduce((s,m)=>s+m.units,0),sessions:funnel.reduce((s,m)=>s+m.sessions,0),purchases:funnel.reduce((s,m)=>s+m.purchases,0),conversionRate:0,revenuePerSession:0};
 summary.conversionRate=summary.sessions?summary.purchases/summary.sessions*100:0;summary.revenuePerSession=summary.sessions?summary.revenue/summary.sessions:0;
 const baseline={revenue:baseCommerce.reduce((s,m)=>s+n(m.revenue),0),units:baseCommerce.reduce((s,m)=>s+m.units,0),sessions:baseFunnel.reduce((s,m)=>s+m.sessions,0),purchases:baseFunnel.reduce((s,m)=>s+m.purchases,0),conversionRate:0};baseline.conversionRate=baseline.sessions?baseline.purchases/baseline.sessions*100:0;
 const channelMap=new Map<string,{name:string;revenue:number;units:number;sessions:number;purchases:number;conversionRate:number}>();
 for(const m of commerce){const key=m.channelId,x=channelMap.get(key)??{name:m.channel.name,revenue:0,units:0,sessions:0,purchases:0,conversionRate:0};x.revenue+=n(m.revenue);x.units+=m.units;channelMap.set(key,x)}
 for(const m of funnel){const key=m.channelId??"unattributed",x=channelMap.get(key)??{name:m.channel?.name??"Unattributed",revenue:0,units:0,sessions:0,purchases:0,conversionRate:0};x.sessions+=m.sessions;x.purchases+=m.purchases;channelMap.set(key,x)}
 const channels=[...channelMap.values()].map(x=>({...x,conversionRate:x.sessions?x.purchases/x.sessions*100:0})).sort((a,b)=>b.revenue-a.revenue);
 const products=campaign.products.map(cp=>{const c=commerce.filter(m=>m.productId===cp.product.id),f=funnel.filter(m=>m.productId===cp.product.id),revenue=c.reduce((s,m)=>s+n(m.revenue),0),units=c.reduce((s,m)=>s+m.units,0),sessions=f.reduce((s,m)=>s+m.sessions,0),purchases=f.reduce((s,m)=>s+m.purchases,0);return{sku:cp.product.sku,name:cp.product.name,revenue,units,sessions,purchases,conversionRate:sessions?purchases/sessions*100:0}}).sort((a,b)=>b.revenue-a.revenue);
 return NextResponse.json({campaign:{id:campaign.id,name:campaign.name,objective:campaign.objective,startDate:campaign.startDate,endDate:campaign.endDate,status:campaign.status},summary,baseline,channels,products});
}