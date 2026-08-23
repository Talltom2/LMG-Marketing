import Link from "next/link";
import {db} from "@/lib/db";
import LmgTopNav from "@/components/LmgTopNav";

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value)}
function dateLabel(value:Date){return value.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
export const dynamic="force-dynamic";

export default async function Home(){
  const endDate=new Date();
  const startDate=new Date(endDate.getTime()-7*86400000);
  const priorStart=new Date(startDate.getTime()-7*86400000);
  const[metrics,priorMetrics,topProducts,channelTotals,allChannels,campaigns,syncRuns]=await Promise.all([
    db.commerceMetric.findMany({where:{date:{gte:startDate,lte:endDate},OR:[{units:{gt:0}},{revenue:{gt:0}}]},select:{units:true,revenue:true}}),
    db.commerceMetric.findMany({where:{date:{gte:priorStart,lt:startDate},OR:[{units:{gt:0}},{revenue:{gt:0}}]},select:{units:true,revenue:true}}),
    db.commerceMetric.groupBy({by:["productId"],where:{date:{gte:startDate,lte:endDate}},_sum:{units:true,revenue:true},orderBy:{_sum:{revenue:"desc"}},take:5}),
    db.commerceMetric.groupBy({by:["channelId"],where:{date:{gte:startDate,lte:endDate}},_sum:{units:true,revenue:true},orderBy:{_sum:{revenue:"desc"}}}),
    db.channel.findMany({select:{id:true,type:true,name:true,active:true}}),
    db.campaign.findMany({where:{status:{in:["PLANNED","ACTIVE","PAUSED"]}},select:{id:true,name:true,status:true,startDate:true,endDate:true},orderBy:{startDate:"asc"},take:8}),
    db.syncRun.findMany({orderBy:{startedAt:"desc"},take:12}),
  ]);
  const revenue=metrics.reduce((s,m)=>s+Number(m.revenue),0),units=metrics.reduce((s,m)=>s+m.units,0),priorRevenue=priorMetrics.reduce((s,m)=>s+Number(m.revenue),0);
  const revenueChange=priorRevenue?((revenue-priorRevenue)/priorRevenue)*100:null;
  const productIds=topProducts.map(x=>x.productId),channelIds=channelTotals.map(x=>x.channelId);
  const[products,channels]=await Promise.all([
    db.product.findMany({where:{id:{in:productIds}},select:{id:true,sku:true,name:true}}),
    db.channel.findMany({where:{id:{in:channelIds}},select:{id:true,name:true}}),
  ]);
  const productMap=new Map(products.map(p=>[p.id,p])),channelMap=new Map(channels.map(c=>[c.id,c]));
  const connectedCount=allChannels.filter(c=>c.active).length,failedSyncs=syncRuns.filter(s=>s.status==="FAILED").length,activeCampaigns=campaigns.filter(c=>c.status==="ACTIVE").length,plannedCampaigns=campaigns.filter(c=>c.status==="PLANNED").length;
  const topProductRow=topProducts[0],topProduct=topProductRow?productMap.get(topProductRow.productId):undefined,topProductRevenue=Number(topProductRow?._sum.revenue??0);
  const topChannelRow=channelTotals[0],topChannel=topChannelRow?channelMap.get(topChannelRow.channelId):undefined,topChannelRevenue=Number(topChannelRow?._sum.revenue??0);
  const strengths=[revenueChange!==null&&revenueChange>0?`Revenue is up ${revenueChange.toFixed(0)}% versus the prior 7-day period.`:`${money(revenue)} revenue recorded in the last 7 days.`,topProduct?`${topProduct.name} is the current top-selling product.`:"Product-level campaign intelligence is online.",topChannel?`${topChannel.name} is the strongest attributed sales channel.`:`${connectedCount} channels are connected.`];
  const weaknesses=[revenueChange!==null&&revenueChange<0?`Revenue is down ${Math.abs(revenueChange).toFixed(0)}% versus the prior period.`:"Several channels still need complete native telemetry.",failedSyncs?`${failedSyncs} recent synchronization run${failedSyncs===1?"":"s"} failed.`:"Full-funnel attribution remains incomplete on unfinished connections.","Automated external execution still depends on finishing channel adapters."];
  const opportunities=[plannedCampaigns?`${plannedCampaigns} planned campaign${plannedCampaigns===1?" is":"s are"} available to activate.`:"Use Campaign Opportunity Intelligence to fill an open window.",topProduct?`Build a related-product campaign around ${topProduct.name}.`:"Promote the strongest product family or collection.","Reuse successful closeout learning to accelerate the next campaign."];
  const threats=[failedSyncs?"Integration failures can create blind spots in campaign decisions.":"Incomplete platform connections can delay execution.",activeCampaigns>1?`${activeCampaigns} campaigns are active at once; watch for channel or budget conflict.`:"Paid-media underperformance can consume budget quickly.","Marketplace and advertising policy changes can interrupt delivery."];
  const upcoming=campaigns.filter(c=>c.status!=="ACTIVE").slice(0,3);
  const avgPerUnit=units?revenue/units:0;
  return <main className="dashboard-home"><LmgTopNav active="/"/>
    <section className="dashboard-welcome"><div><h1>Marketing Command Center</h1><p>At-a-glance performance, campaign intelligence, risks and next actions.</p></div><span className="dashboard-period">{dateLabel(startDate)} – {dateLabel(endDate)}</span></section>
    <div className="dashboard-layout">
      <aside className="dash-stack dashboard-left">
        <section className="dash-panel"><h3>Performance Overview</h3><div className="perf-list"><div className="perf-row"><span>Revenue</span><strong>{money(revenue)}</strong>{revenueChange!==null&&<small className={revenueChange>=0?"trend-up":"trend-down"}>{revenueChange>=0?"↑":"↓"} {Math.abs(revenueChange).toFixed(1)}% vs prior 7 days</small>}</div><div className="perf-row"><span>Units Sold</span><strong>{units}</strong><small>Last 7 days</small></div><div className="perf-row"><span>Revenue / Unit</span><strong>{money(avgPerUnit)}</strong><small>Calculated</small></div><div className="perf-row"><span>Connected Channels</span><strong>{connectedCount}</strong><small>Active integrations</small></div></div></section>
        <section className="dash-panel leader-card"><h3>Top Performing Channel</h3><strong>{topChannel?.name??"Waiting for attribution"}</strong><span>{money(topChannelRevenue)}</span><small>{revenue?`${(topChannelRevenue/revenue*100).toFixed(1)}% of recent revenue`:"No current revenue"}</small><p><Link href="/campaigns/metrics">View channel performance →</Link></p></section>
        <section className="dash-panel leader-card"><h3>Top Performing Product</h3><strong>{topProduct?.name??"Waiting for sales data"}</strong><span>{money(topProductRevenue)}</span><small>{topProduct?.sku??"Product intelligence online"}</small><p><Link href="/campaigns">Promote this product →</Link></p></section>
      </aside>
      <section className="dashboard-center">
        <div className="dash-kpis"><article className="dash-kpi"><span>Active Campaigns</span><strong>{activeCampaigns}</strong><small>{plannedCampaigns} planned</small></article><article className="dash-kpi"><span>Connected Channels</span><strong>{connectedCount}</strong><small>Marketing ecosystem</small></article><article className="dash-kpi"><span>7-Day Revenue</span><strong>{money(revenue)}</strong><small>Commerce telemetry</small></article><article className="dash-kpi"><span>Units Sold</span><strong>{units}</strong><small>Last 7 days</small></article><article className="dash-kpi"><span>Data Health</span><strong>{failedSyncs?"Watch":"Good"}</strong><small>{failedSyncs?`${failedSyncs} failed syncs`:"No recent failed syncs"}</small></article></div>
        <section className="swot-command"><div className="swot-heading"><div><h2>SWOT At-a-Glance</h2><p>Live strategic summary from LMG Marketing intelligence.</p></div><Link href="/campaigns/diagnostics">Open diagnostics →</Link></div><div className="swot-grid">{[["Strengths",strengths,"strength"],["Weaknesses",weaknesses,"weakness"],["Opportunities",opportunities,"opportunity"],["Threats",threats,"threat"]].map(([title,items,tone])=><article className={`swot-card ${tone}`} key={String(title)}><h3>{title}</h3>{(items as string[]).map((item,i)=><p key={i}>{item}</p>)}</article>)}</div></section>
      </section>
      <aside className="dash-stack dashboard-right">
        <section className="dash-panel"><div className="dash-panel-heading"><h3>Alerts & Exceptions</h3><Link href="/campaigns/alerts">View all</Link></div><div className="alert-list">{failedSyncs?<div className="alert-item critical"><strong>Integration attention required</strong><small>{failedSyncs} recent failed sync{failedSyncs===1?"":"s"}</small></div>:<div className="alert-item"><strong>No critical sync failures</strong><small>Core data feeds are reporting normally.</small></div>}<div className="alert-item"><strong>Channel execution readiness</strong><small>Some external publishing adapters are still being completed.</small></div>{activeCampaigns>1&&<div className="alert-item"><strong>Campaign overlap</strong><small>{activeCampaigns} campaigns are currently active.</small></div>}</div></section>
        <section className="dash-panel"><div className="dash-panel-heading"><h3>Upcoming Campaigns</h3><Link href="/campaigns/calendar">View calendar</Link></div><div className="campaign-mini-list">{upcoming.length?upcoming.map(c=><div key={c.id}><strong>{c.name}</strong><small>{dateLabel(c.startDate)} – {dateLabel(c.endDate)}</small></div>):<div><strong>Open campaign capacity</strong><small>Use Campaign Opportunity Intelligence to propose the next promotion.</small></div>}</div></section>
        <section className="dash-panel"><h3>Quick Actions</h3><div className="quick-actions"><Link href="/campaigns">＋ Create New Campaign</Link><Link href="/campaigns/production">▣ Open Creative Studio</Link><Link href="/campaigns/diagnostics">✣ Run Diagnostic Review</Link><Link href="/campaigns/calendar">▦ View Campaign Calendar</Link></div></section>
      </aside>
    </div>
    <footer className="dashboard-footer"><span>LMG Marketing · Laughing Moose Gifts</span><span>Data → Diagnose → Recommend → Execute → Measure → Learn</span></footer>
  </main>;
}