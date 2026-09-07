import {fetchGa4FunnelSummary} from "@/lib/ga4";
import {wooRequest} from "@/lib/integrations/woocommerce/client";

export type WooFunnelOrder={id:number;status:string;date_created_gmt?:string|null;date_created?:string|null};

export type DashboardFunnelSources={
  ga4Available:boolean;
  wooAvailable:boolean;
  sessions:number;
  users:number;
  pageViews:number;
  addToCarts:number;
  checkoutStarts:number;
  transactions:number;
  cartToViewRate:number|null;
  orders:number;
};

export async function fetchWooFunnelOrders(start:Date,end:Date):Promise<WooFunnelOrder[]>{
  const orders:WooFunnelOrder[]=[];
  for(let page=1;page<=50;page+=1){
    const rows=await wooRequest<WooFunnelOrder[]>("/orders",{
      after:start.toISOString(),
      before:end.toISOString(),
      per_page:100,
      page,
      orderby:"date",
      order:"asc",
    });
    orders.push(...rows);
    if(rows.length<100)break;
  }
  return orders;
}

export function isCompletedFunnelOrder(order:WooFunnelOrder){
  return order.status==="processing"||order.status==="completed";
}

export async function fetchDashboardFunnelSources(start:Date,end:Date):Promise<DashboardFunnelSources>{
  const startDay=start.toISOString().slice(0,10);
  const endDay=end.toISOString().slice(0,10);

  const [ga4Result,wooResult]=await Promise.all([
    fetchGa4FunnelSummary(startDay,endDay)
      .then(summary=>({ok:true as const,summary}))
      .catch(()=>({ok:false as const,summary:{sessions:0,users:0,pageViews:0,addToCarts:0,checkouts:0,transactions:0,cartToViewRate:null}})),
    fetchWooFunnelOrders(start,end)
      .then(rows=>({ok:true as const,rows}))
      .catch(()=>({ok:false as const,rows:[]})),
  ]);

  const orders=wooResult.rows.filter(isCompletedFunnelOrder).length;

  return{
    ga4Available:ga4Result.ok,
    wooAvailable:wooResult.ok,
    sessions:ga4Result.summary.sessions,
    users:ga4Result.summary.users,
    pageViews:ga4Result.summary.pageViews,
    addToCarts:ga4Result.summary.addToCarts,
    checkoutStarts:ga4Result.summary.checkouts,
    transactions:ga4Result.summary.transactions,
    cartToViewRate:ga4Result.summary.cartToViewRate,
    orders,
  };
}
