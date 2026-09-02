import {db} from "@/lib/db";
import FunnelTrendChart from "@/components/FunnelTrendChart";

const DAY=86400000;

export default async function FunnelTrendSection(){
  const now=new Date();
  const currentEnd=new Date(now);currentEnd.setHours(23,59,59,999);
  const weeks=26;
  const historyStart=new Date(currentEnd.getTime()-(weeks*7-1)*DAY);historyStart.setHours(0,0,0,0);
  const rows=await db.funnelMetric.findMany({where:{date:{gte:historyStart,lte:currentEnd},source:{startsWith:"lmg-analytics:"}},select:{date:true,sessions:true,productViews:true,addToCarts:true,checkoutStarts:true,purchases:true},orderBy:{date:"asc"}});
  const points=Array.from({length:weeks},(_,i)=>{
    const end=new Date(currentEnd.getTime()-(weeks-1-i)*7*DAY);
    const start=new Date(end.getTime()-6*DAY);start.setHours(0,0,0,0);
    let visitors=0,pageViews=0,addToCarts=0,checkoutVisits=0,ordersCompleted=0;
    for(const row of rows){if(row.date>=start&&row.date<=end){visitors+=row.sessions;pageViews+=row.productViews;addToCarts+=row.addToCarts;checkoutVisits+=row.checkoutStarts;ordersCompleted+=row.purchases}}
    return{date:end.toISOString().slice(0,10),label:end.toLocaleDateString("en-US",{month:"short",day:"numeric"}),visitors,pageViews,addToCarts,checkoutVisits,ordersCompleted};
  });
  return <FunnelTrendChart data={points}/>;
}
