"use client";
import {useEffect,useMemo,useState} from "react";
import LmgTopNav from "@/components/LmgTopNav";

type Product={sku:string;name:string};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;products:{product:Product}[]};
type Metrics={campaign:Campaign;summary:{revenue:number;units:number;sessions:number;purchases:number;conversionRate:number;revenuePerSession:number};baseline:{revenue:number;units:number;sessions:number;purchases:number;conversionRate:number};channels:{name:string;revenue:number;units:number;sessions:number;purchases:number;conversionRate:number}[];products:{sku:string;name:string;revenue:number;units:number;sessions:number;purchases:number;conversionRate:number}[]};
const money=(n:number)=>n.toLocaleString("en-US",{style:"currency",currency:"USD"});
const pct=(n:number)=>`${n.toFixed(1)}%`;
const signedMoney=(n:number)=>`${n>=0?"+":"-"}${money(Math.abs(n))}`;
const tone=(n:number)=>n>0?"positive":n<0?"negative":"neutral";
export default function CampaignMetricsPage(){
 const[campaigns,setCampaigns]=useState<Campaign[]>([]),[id,setId]=useState(""),[data,setData]=useState<Metrics|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/campaigns",{cache:"no-store"}).then(r=>r.json()).then(d=>{const list=d.campaigns??[];setCampaigns(list);if(list[0])setId(list[0].id)}).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(!id)return;setLoading(true);fetch(`/api/campaigns/${id}/metrics`,{cache:"no-store"}).then(r=>r.json()).then(setData).finally(()=>setLoading(false))},[id]);
 const delta=useMemo(()=>data?{revenue:data.summary.revenue-data.baseline.revenue,units:data.summary.units-data.baseline.units,sessions:data.summary.sessions-data.baseline.sessions,conversion:data.summary.conversionRate-data.baseline.conversionRate}:null,[data]);
 return <main className="metrics-shell"><LmgTopNav active="/campaigns/metrics"/>
 <header className="metrics-hero"><div><p className="eyebrow">Campaign Intelligence</p><h1>Campaign Metrics Dashboard</h1><p>See campaign performance at a glance, compare it with the pre-campaign baseline, and identify which channels and products are driving the result.</p></div><div className="hero-badge"><span>Measurement layer</span><strong>Expected vs. Actual</strong><small>Feeds campaign diagnostics next</small></div></header>
 <section className="metrics-picker"><label><span>Campaign</span><select value={id} onChange={e=>setId(e.target.value)}>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{data&&<div className="campaign-context"><span className={`campaign-status status-${data.campaign.status.toLowerCase()}`}>{data.campaign.status}</span><strong>{data.campaign.name}</strong><small>{data.campaign.startDate.slice(0,10)} → {data.campaign.endDate.slice(0,10)}</small></div>}</section>
 {loading?<section className="metrics-panel loading-card">Loading campaign metrics…</section>:!data?<section className="metrics-panel">No campaign selected.</section>:<>
 <section className="score-grid">{[
  ["Revenue",money(data.summary.revenue),delta?signedMoney(delta.revenue):"",delta?.revenue??0],
  ["Units",String(data.summary.units),delta?`${delta.units>=0?"+":""}${delta.units}`:"",delta?.units??0],
  ["Sessions",data.summary.sessions.toLocaleString(),delta?`${delta.sessions>=0?"+":""}${delta.sessions}`:"",delta?.sessions??0],
  ["Purchases",data.summary.purchases.toLocaleString(),"",0],
  ["Conversion",pct(data.summary.conversionRate),delta?`${delta.conversion>=0?"+":""}${delta.conversion.toFixed(1)} pts`:"",delta?.conversion??0],
  ["Revenue / Session",money(data.summary.revenuePerSession),"",0]
 ].map(([label,value,d,n])=><article className="score-card" key={String(label)}><span>{label}</span><strong>{value}</strong>{d&&<small className={tone(Number(n))}>{d} vs baseline</small>}</article>)}</section>
 <section className="metrics-panel baseline-panel"><div className="panel-heading"><div><p className="eyebrow">Expected vs. actual</p><h2>Pre-campaign baseline comparison</h2></div><span>Equal-length period immediately before campaign start</span></div><div className="comparison-grid"><div><span>Revenue</span><strong>{money(data.baseline.revenue)} <b>→</b> {money(data.summary.revenue)}</strong></div><div><span>Units</span><strong>{data.baseline.units} <b>→</b> {data.summary.units}</strong></div><div><span>Sessions</span><strong>{data.baseline.sessions} <b>→</b> {data.summary.sessions}</strong></div><div><span>Conversion</span><strong>{pct(data.baseline.conversionRate)} <b>→</b> {pct(data.summary.conversionRate)}</strong></div></div></section>
 <section className="metrics-two"><div className="metrics-panel"><div className="panel-heading"><div><p className="eyebrow">Channel contribution</p><h2>Where results are coming from</h2></div></div><div className="metrics-table-wrap"><table><thead><tr><th>Channel</th><th>Revenue</th><th>Units</th><th>Sessions</th><th>Conv.</th></tr></thead><tbody>{data.channels.length?data.channels.map(c=><tr key={c.name}><td><strong>{c.name}</strong></td><td>{money(c.revenue)}</td><td>{c.units}</td><td>{c.sessions}</td><td>{pct(c.conversionRate)}</td></tr>):<tr><td colSpan={5}>No channel-attributed metrics yet.</td></tr>}</tbody></table></div></div>
 <div className="metrics-panel"><div className="panel-heading"><div><p className="eyebrow">Product performance</p><h2>What is actually selling</h2></div></div><div className="metrics-table-wrap"><table><thead><tr><th>Product</th><th>Revenue</th><th>Units</th><th>Sessions</th><th>Conv.</th></tr></thead><tbody>{data.products.map(p=><tr key={p.sku}><td><strong>{p.name}</strong><small>{p.sku}</small></td><td>{money(p.revenue)}</td><td>{p.units}</td><td>{p.sessions}</td><td>{pct(p.conversionRate)}</td></tr>)}</tbody></table></div></div></section>
 <section className="metrics-panel diagnostic-preview"><div><p className="eyebrow">Next intelligence layer</p><h2>Campaign diagnosis & optimization</h2><p>This scoreboard is the measurement foundation for anomaly detection, Expected vs. Actual analysis, channel/product recommendations, and mid-campaign corrective action.</p></div><span className="diagnostic-arrow">→</span></section></>}
 </main>;
}