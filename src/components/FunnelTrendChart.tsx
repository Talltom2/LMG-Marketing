"use client";

import {useState} from "react";

type FunnelPoint={date:string;label:string;visitors:number;pageViews:number;addToCarts:number;checkoutVisits:number;ordersCompleted:number};
type MetricKey="visitors"|"pageViews"|"addToCarts"|"checkoutVisits"|"ordersCompleted";
type MetricLabels=Record<MetricKey,string>;

const metricColors:Record<MetricKey,string>={
  visitors:"#315f32",
  pageViews:"#2563a6",
  addToCarts:"#b56a18",
  checkoutVisits:"#7b4aa8",
  ordersCompleted:"#b43d4c",
};
const metricKeys:MetricKey[]=["visitors","pageViews","addToCarts","checkoutVisits","ordersCompleted"];

export default function FunnelTrendChart({data,labels}:{data:FunnelPoint[];labels:MetricLabels}){
  const metrics=metricKeys.map(key=>({key,label:labels[key],color:metricColors[key]}));
  const[selected,setSelected]=useState<MetricKey[]>(metricKeys);
  const toggle=(key:MetricKey)=>setSelected(current=>current.includes(key)?(current.length===1?current:current.filter(k=>k!==key)):[...current,key]);
  const width=900,height=290,padX=54,padTop=24,padBottom=44,plotH=height-padTop-padBottom,plotW=width-padX*2;
  const max=Math.max(1,...data.flatMap(d=>selected.map(key=>d[key])));
  const series=metrics.filter(m=>selected.includes(m.key)).map(metric=>{
    const points=data.map((d,i)=>({x:data.length<=1?padX:padX+(i/(data.length-1))*plotW,y:padTop+plotH-(d[metric.key]/max)*plotH,d}));
    return{...metric,points,polyline:points.map(p=>`${p.x},${p.y}`).join(" ")};
  });
  const latest=data.at(-1);

  return <section style={{marginTop:16,padding:18,border:"1px solid #e0e5dc",borderRadius:16,background:"#fff",boxShadow:"0 5px 18px rgba(35,57,35,.05)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:18,marginBottom:14}}><div><h2 style={{margin:0,color:"#1e2f21"}}>6-Month Funnel Trend</h2><p style={{margin:"4px 0 0",color:"#6d776c"}}>Each point is a complete 7-day total. Select any combination of funnel metrics to compare them simultaneously.</p></div><div style={{textAlign:"right",minWidth:160}}><strong style={{display:"block",fontSize:"1rem",color:"#173c1c"}}>{selected.length} metric{selected.length===1?"":"s"} shown</strong><span style={{fontSize:12,color:"#657064"}}>latest 7-day period</span></div></div>
    <div aria-label="Website funnel trend metrics" style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>{metrics.map(m=>{const active=selected.includes(m.key);return <button type="button" aria-pressed={active} key={m.key} onClick={()=>toggle(m.key)} style={{padding:"8px 11px",borderRadius:9,border:active?`2px solid ${m.color}`:"1px solid #d5ddd1",background:active?"#f7faf5":"#fbfcfa",color:active?m.color:"#7b8579",fontWeight:800,cursor:"pointer"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:m.color,marginRight:6}}/>{m.label}{latest&&active?` · ${latest[m.key].toLocaleString()}`:""}</button>})}</div>
    <div style={{overflowX:"auto",width:"100%"}}><svg viewBox={`0 0 ${width} ${height}`} style={{display:"block",width:"100%",minWidth:680,height:"auto"}} role="img" aria-label="Selected weekly funnel metrics over the last 6 months">
      {[0,.25,.5,.75,1].map((fraction,i)=>{const y=padTop+plotH-fraction*plotH;return <g key={i}><line x1={padX} x2={width-padX} y1={y} y2={y} stroke="#e5eae2" strokeWidth="1"/><text x={padX-10} y={y+4} textAnchor="end" fill="#7a8578" fontSize="11">{Math.round(max*fraction).toLocaleString()}</text></g>})}
      {series.map(s=><g key={s.key}><polyline points={s.polyline} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{s.points.map(p=><circle key={`${s.key}-${p.d.date}`} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2"><title>{`${p.d.label}: ${p.d[s.key].toLocaleString()} ${s.label}`}</title></circle>)}</g>)}
      {data.map((d,i)=>{const x=data.length<=1?padX:padX+(i/(data.length-1))*plotW;return(i%4===0||i===data.length-1)?<text key={d.date} x={x} y={height-14} textAnchor="middle" fill="#6f7a6d" fontSize="11">{d.label}</text>:null})}
    </svg></div>
  </section>;
}
