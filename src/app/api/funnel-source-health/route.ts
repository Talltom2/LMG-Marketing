import {NextResponse} from "next/server";
import {fetchDashboardFunnelSources} from "@/lib/dashboard-funnel";

export const dynamic="force-dynamic";

export async function GET(){
  const end=new Date();end.setUTCDate(end.getUTCDate()-1);end.setUTCHours(23,59,59,999);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-6);start.setUTCHours(0,0,0,0);
  const result=await fetchDashboardFunnelSources(start,end);
  return NextResponse.json({
    start:start.toISOString(),
    end:end.toISOString(),
    ga4Available:result.ga4Available,
    wooAvailable:result.wooAvailable,
    users:result.users,
    pageViews:result.pageViews,
    addToCarts:result.addToCarts,
    checkoutStarts:result.checkoutStarts,
    transactions:result.transactions,
    orders:result.orders,
  });
}
