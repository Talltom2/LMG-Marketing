import {db} from "@/lib/db";
import {fetchGa4DailyFunnel} from "@/lib/ga4";
import {fetchWooFunnelOrders,isCompletedFunnelOrder,type WooFunnelOrder} from "@/lib/dashboard-funnel";
import FunnelTrendChart from "@/components/FunnelTrendChart";

const DAY=86400000;

function wooOrderDate(order:WooFunnelOrder){
  const raw=order.date_created_gmt||order.date_created;
  if(!raw)return null;
  const normalized=order.date_created_gmt&&!raw.endsWith("Z")?`${raw}Z`:raw;
  const date=new Date(normalized);
  return Number.isNaN(date.getTime())?null:date;
}

export default async function FunnelTrendSection(){
  const currentEnd=new Date();currentEnd.setUTCDate(currentEnd.getUTCDate()-1);currentEnd.setUTCHours(23,59,59,999);
  const weeks=26;
  const historyStart=new Date(currentEnd.getTime()-(weeks*7-1)*DAY);historyStart.setUTCHours(0,0,0,0);
  const [rows,ga4Result,wooResult]=await Promise.all([
    db.funnelMetric.findMany({where:{date:{gte:historyStart,lte:currentEnd},source:{startsWith:"lmg-analytics:"}},select:{date:true,sessions:true,productViews:true,addToCarts:true,purchases:true},orderBy:{date:"asc"}}),
    fetchGa4DailyFunnel(historyStart.toISOString().slice(0,10),currentEnd.toISOString().slice(0,10)).then(rows=>({ok:true as const,rows})).catch(()=>({ok:false as const,rows:[]})),
    fetchWooFunnelOrders(historyStart,currentEnd).then(rows=>({ok:true as const,rows})).catch(()=>({ok:false as const,rows:[]})),
  ]);
  const points=Array.from({length:weeks},(_,i)=>{
    const end=new Date(currentEnd.getTime()-(weeks-1-i)*7*DAY);
    const start=new Date(end.getTime()-6*DAY);start.setUTCHours(0,0,0,0);
    let lmgSessions=0,lmgProductViews=0,lmgAddToCarts=0,lmgPurchases=0;
    for(const row of rows){if(row.date>=start&&row.date<=end){lmgSessions+=row.sessions;lmgProductViews+=row.productViews;lmgAddToCarts+=row.addToCarts;lmgPurchases+=row.purchases}}
    let visitors=lmgSessions,pageViews=lmgProductViews,addToCarts=lmgAddToCarts,checkoutVisits=0,ga4Transactions=0;
    if(ga4Result.ok){
      visitors=0;pageViews=0;addToCarts=0;
      const startKey=start.toISOString().slice(0,10),endKey=end.toISOString().slice(0,10);
      for(const row of ga4Result.rows){if(row.date>=startKey&&row.date<=endKey){visitors+=row.users;pageViews+=row.pageViews;addToCarts+=row.addToCarts;checkoutVisits+=row.checkouts;ga4Transactions+=row.transactions}}
    }
    let ordersCompleted=ga4Result.ok?ga4Transactions:lmgPurchases;
    if(wooResult.ok){
      ordersCompleted=wooResult.rows.filter(order=>{
        if(!isCompletedFunnelOrder(order))return false;
        const date=wooOrderDate(order);return !!date&&date>=start&&date<=end;
      }).length;
    }
    return{date:end.toISOString().slice(0,10),label:end.toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}),visitors,pageViews,addToCarts,checkoutVisits,ordersCompleted};
  });
  const labels={
    visitors:ga4Result.ok?"Visitors":"Sessions",
    pageViews:ga4Result.ok?"Page Views":"Product Views",
    addToCarts:"Add to Carts",
    checkoutVisits:"Checkout Starts",
    ordersCompleted:"Orders",
  };
  const availability={
    visitors:true,
    pageViews:true,
    addToCarts:true,
    checkoutVisits:ga4Result.ok,
    ordersCompleted:wooResult.ok||ga4Result.ok||rows.some(row=>row.purchases>0),
  };
  return <FunnelTrendChart data={points} labels={labels} availability={availability}/>;
}
