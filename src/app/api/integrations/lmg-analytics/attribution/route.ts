import { NextResponse } from "next/server";
import { ChannelType } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";

const SOURCES=["pinterest","tiktok","instagram","facebook","bing","google","organic","direct","email","referral"];
const label=(s:string)=>({pinterest:"Pinterest",tiktok:"TikTok",instagram:"Instagram",facebook:"Facebook",bing:"Bing / Microsoft",google:"Google",organic:"Organic Search",direct:"Direct",email:"Email",referral:"Referral"}[s]??s.replace(/(^|-)([a-z])/g,(_,a,b)=>`${a?" ":""}${b.toUpperCase()}`));

type FunnelGroup={sessions:number;productViews:number;addToCarts:number;checkoutStarts:number;purchases:number;revenue:number};

function diagnose(g:FunnelGroup){
  const viewEventsPerSession=g.sessions?g.productViews/g.sessions:null;
  const cartEventsPerProductView=g.productViews?g.addToCarts/g.productViews:null;
  const checkoutStartsPerCartEvent=g.addToCarts?g.checkoutStarts/g.addToCarts:null;
  const ordersPerCheckoutStart=g.checkoutStarts?g.purchases/g.checkoutStarts:null;
  const ordersPerSession=g.sessions?g.purchases/g.sessions:null;

  let health:"GREEN"|"YELLOW"|"RED"="YELLOW";
  let stage="TRAFFIC";
  let diagnosis="No recent attributed traffic.";
  let recommendation="Build enough attributed traffic to establish a reliable funnel baseline.";

  if(g.sessions>=20&&g.productViews/g.sessions<.25){
    health="RED";
    stage="ENGAGEMENT";
    diagnosis="Traffic arrives but relatively few product-view events are recorded per session.";
    recommendation="Improve landing-page relevance and links to shoppable product pages, and verify product-view tracking.";
  }else if(g.productViews>=20&&g.addToCarts===0){
    health="RED";
    stage="PRODUCT_CONVERSION";
    diagnosis="Product-view activity is present but no add-to-cart events are recorded.";
    recommendation="Review the product-page offer and verify that add_to_cart tracking fires when a shopper actually adds an item.";
  }else if(g.addToCarts>=10&&g.checkoutStarts===0){
    health="RED";
    stage="CART_TELEMETRY";
    diagnosis="Add-to-cart event volume is substantial, but no checkout-start events are recorded. Treat the cart count as event telemetry, not as a shopper conversion percentage, until event firing is verified.";
    recommendation="Audit add_to_cart and begin_checkout event firing for duplication, missing checkout telemetry, and cart or checkout friction before changing merchandising or increasing traffic.";
  }else if(g.addToCarts>=5&&checkoutStartsPerCartEvent!=null&&checkoutStartsPerCartEvent<.3){
    health="RED";
    stage="CART_CHECKOUT";
    diagnosis="Checkout-start event volume is low relative to add-to-cart event volume. This is an event-progression ratio, not a percentage of shoppers.";
    recommendation="Inspect both cart/checkout telemetry and real cart friction such as shipping-cost surprises, coupon behavior and checkout call-to-action.";
  }else if(g.checkoutStarts>=3&&g.purchases===0){
    health="RED";
    stage="CHECKOUT";
    diagnosis="Checkout-start events are being recorded but no completed orders are present.";
    recommendation="Review payment failures, shipping options, checkout errors and trust/friction at checkout.";
  }else if(g.sessions>=20&&g.purchases===0){
    health="RED";
    stage="CONVERSION";
    diagnosis="Meaningful traffic has produced no completed orders.";
    recommendation="Trace the weakest measured funnel stage before spending more on this source.";
  }else if(g.sessions>=10&&ordersPerSession!=null&&ordersPerSession>=.02){
    health="GREEN";
    stage="HEALTHY";
    diagnosis="This source is producing at least 2 completed orders per 100 sessions.";
    recommendation="Maintain this source and consider scaling while monitoring margin and data quality.";
  }else if(g.sessions>0){
    health="YELLOW";
    stage="WATCH";
    diagnosis="Some traffic is present; more volume or stronger order production is needed.";
    recommendation="Continue collecting data and investigate the weakest measured funnel stage.";
  }

  return{
    health,
    stage,
    diagnosis,
    recommendation,
    viewEventsPerSession,
    cartEventsPerProductView,
    checkoutStartsPerCartEvent,
    ordersPerCheckoutStart,
    ordersPerSession,
    revenuePerSession:g.sessions?g.revenue/g.sessions:null,
  };
}

export async function GET(){
  try{
    const channel=await db.channel.findFirst({where:{type:ChannelType.WOOCOMMERCE,name:"Laughing Moose Gifts Website"}});
    if(!channel)return NextResponse.json({sources:[],message:"Website channel not found."});

    const since=new Date();
    since.setUTCDate(since.getUTCDate()-7);
    const rows=await db.funnelMetric.findMany({where:{channelId:channel.id,date:{gte:since},source:{startsWith:"lmg-analytics:"}}});
    const grouped=new Map<string,FunnelGroup>();

    for(const r of rows){
      const key=r.source.replace(/^lmg-analytics:/,"")||"other";
      const g=grouped.get(key)??{sessions:0,productViews:0,addToCarts:0,checkoutStarts:0,purchases:0,revenue:0};
      g.sessions+=r.sessions;
      g.productViews+=r.productViews;
      g.addToCarts+=r.addToCarts;
      g.checkoutStarts+=r.checkoutStarts;
      g.purchases+=r.purchases;
      g.revenue+=Number(r.revenue);
      grouped.set(key,g);
    }

    for(const s of SOURCES)if(!grouped.has(s))grouped.set(s,{sessions:0,productViews:0,addToCarts:0,checkoutStarts:0,purchases:0,revenue:0});
    const sources=[...grouped.entries()].map(([source,g])=>({source,label:label(source),...g,...diagnose(g)})).sort((a,b)=>b.revenue-a.revenue||b.sessions-a.sessions);

    return NextResponse.json({
      windowDays:7,
      channelId:channel.id,
      channelName:channel.name,
      metricSemantics:{
        sessions:"Visits/sessions",
        productViews:"Product-view event count",
        addToCarts:"add_to_cart event count",
        checkoutStarts:"begin_checkout event count",
        purchases:"Completed order count",
        ordersPerSession:"Completed orders divided by sessions; not a unique-session conversion rate",
      },
      sources,
    });
  }catch(error){
    return NextResponse.json({message:error instanceof Error?error.message:"Unable to load attribution diagnostics."},{status:500});
  }
}
