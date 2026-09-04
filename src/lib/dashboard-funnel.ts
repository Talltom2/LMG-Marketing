import {fetchGa4DailyFunnel} from "@/lib/ga4";
import {wooRequest} from "@/lib/integrations/woocommerce/client";

export type DashboardFunnelSources={
  ga4Available:boolean;
  wooAvailable:boolean;
  users:number;
  pageViews:number;
  addToCarts:number;
  checkoutStarts:number;
  transactions:number;
  orders:number;
};

type WooOrder={id:number;status:string;date_created_gmt?:string|null;date_created?:string|null};

export async function fetchDashboardFunnelSources(start:Date,end:Date):Promise<DashboardFunnelSources>{
  const startDay=start.toISOString().slice(0,10);
  const endDay=end.toISOString().slice(0,10);

  const [ga4Result,wooResult]=await Promise.all([
    fetchGa4DailyFunnel(startDay,endDay)
      .then(rows=>({ok:true as const,rows}))
      .catch(()=>({ok:false as const,rows:[]})),
    wooRequest<WooOrder[]>("/orders",{after:start.toISOString(),before:end.toISOString(),per_page:100,orderby:"date",order:"asc"})
      .then(rows=>({ok:true as const,rows}))
      .catch(()=>({ok:false as const,rows:[]})),
  ]);

  const ga4=ga4Result.rows.reduce((sum,row)=>({
    users:sum.users+row.users,
    pageViews:sum.pageViews+row.pageViews,
    addToCarts:sum.addToCarts+row.addToCarts,
    checkoutStarts:sum.checkoutStarts+row.checkouts,
    transactions:sum.transactions+row.transactions,
  }),{users:0,pageViews:0,addToCarts:0,checkoutStarts:0,transactions:0});

  const orders=wooResult.rows.filter(order=>order.status==="processing"||order.status==="completed").length;

  return{
    ga4Available:ga4Result.ok,
    wooAvailable:wooResult.ok,
    ...ga4,
    orders,
  };
}
