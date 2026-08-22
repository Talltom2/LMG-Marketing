"use client";
import {useEffect,useState} from "react";
import AutoFixButton from "./AutoFixButton";

type Check={key:string;label:string;health:"GREEN"|"YELLOW"|"RED";value:string;detail:string};
type Finding={layer:string;severity:"CRITICAL"|"WARNING"|"WATCH"|string;title:string;observation:string;recommendation:string;confidence:number};
const color=(h:string)=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";
const findingHealth=(severity:string):"GREEN"|"YELLOW"|"RED"=>severity==="CRITICAL"?"RED":severity==="WARNING"||severity==="WATCH"?"YELLOW":"GREEN";

export default function WebsiteConfigHealth(){
  const[data,setData]=useState<{health:string;checks:Check[];findings:Finding[];dataGaps:string[]}|null>(null);
  const[error,setError]=useState("");
  useEffect(()=>{fetch("/api/integrations/woocommerce/config-health",{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.message);setData(b)}).catch(e=>setError(e instanceof Error?e.message:"Unable to inspect website configuration."));},[]);
  return <section className="panel" style={{display:"block"}}>
    <div><p className="eyebrow">WEBSITE ADMIN / CONFIGURATION HEALTH</p><h2>WooCommerce settings and checkout readiness</h2><p>Checks store settings, inventory controls, taxes, checkout, payment gateways, shipping, HTTPS/system status, and API readability.</p></div>
    {error&&<p>{error}</p>}
    {data&&<>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0 16px"}}><span style={{width:20,height:20,borderRadius:"50%",background:color(data.health)}}/><strong>{data.health}</strong></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>{data.checks.map(c=><article className="module" key={c.key}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:13,height:13,borderRadius:"50%",background:color(c.health)}}/><strong>{c.label}</strong></div><p><strong>{c.value}</strong></p><small>{c.detail}</small></article>)}</div>
      {data.findings.length>0&&<div style={{marginTop:18}}><h3>Configuration findings</h3><div style={{display:"grid",gap:10}}>{data.findings.map((f,i)=>{const h=findingHealth(f.severity);return <article className="module" key={`${f.layer}-${i}`} style={{marginTop:0}}><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}><span title={`${h} configuration health`} aria-label={`${h.toLowerCase()} configuration health`} style={{width:16,height:16,borderRadius:"50%",background:color(h),display:"inline-block",boxShadow:"0 0 0 3px rgba(0,0,0,.04)"}}/><p className="eyebrow" style={{margin:0}}>{f.layer.replaceAll("_"," ")} · {f.severity}</p></div><h4>{f.title}</h4><p><strong>Observation:</strong> {f.observation}</p><p><strong>Recommended:</strong> {f.recommendation}</p><AutoFixButton channelId="website-config" channelName="Laughing Moose Gifts Website" layer={f.layer} title={f.title} observation={f.observation} likelyCause={`WooCommerce configuration finding: ${f.title}`} recommendation={f.recommendation} confidence={f.confidence}/></article>})}</div></div>}
    </>}
  </section>
}
