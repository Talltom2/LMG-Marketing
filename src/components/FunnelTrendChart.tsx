"use client";

import {useMemo,useState} from "react";

type FunnelPoint={date:string;label:string;visitors:number;pageViews:number;addToCarts:number;checkoutVisits:number;ordersCompleted:number};
type MetricKey="visitors"|"pageViews"|"addToCarts"|"checkoutVisits"|"ordersCompleted";

const metrics:{key:MetricKey;label:string}[]=[
  {key:"visitors",label:"Visitors"},
  {key:"pageViews",label:"Page Views"},
  {key:"addToCarts",label:"Add to Carts"},
  {key:"checkoutVisits",label:"Visit Checkout"},
  {key:"ordersCompleted",label:"Orders Completed"},
];

export default function FunnelTrendChart({data}:{data:FunnelPoint[]}){
  const[metric,setMetric]=useState<MetricKey>("visitors");
  const selected=metrics.find(m=>m.key===metric)??metrics[0];
  const values=data.map(d=>d[metric]);
  const max=Math.max(...values,1);
  const width=900,height=270,padX=54,padTop=24,padBottom=44,plotH=height-padTop-padBottom,plotW=width-padX*2;
  const points=useMemo(()=>data.map((d,i)=>{
    const x=data.length<=1?padX:padX+(i/(data.length-1))*plotW;
    const y=padTop+plotH-(d[metric]/max)*plotH;
    return{x,y,d};
  }),[data,metric,max,plotH,plotW]);
  const polyline=points.map(p=>`${p.x},${p.y}`).join(" ");
  const latest=values.at(-1)??0;
  const prior=values.at(-2)??0;
  const change=prior?((latest-prior)/prior)*100:null;

  return <section style={{marginTop:16,padding:18,border:"1px solid #e0e5dc",borderRadius:16,background:"#fff",boxShadow:"0 5px 18px rgba(35,57,35,.05)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:18,marginBottom:14}}><div><h2 style={{margin:0,color:"#1e2f21"}}>6-Month Funnel Trend</h2><p style={{margin:"4px 0 0",color:"#6d776c"}}>Each point represents a complete 7-day total, allowing week-over-week comparison of the funnel metrics above.</p></div><div style={{textAlign:"right",minWidth:150}}><strong style={{display:"block",fontSize:"1.5rem",color:"#173c1c"}}>{latest.toLocaleString()}</strong><span style={{display:"block",fontSize:12,color:"#657064"}}>latest 7-day {selected.label.toLowerCase()}</span>{change!==null&&<small className={change>=0?"trend-up":"trend-down"}>{change>=0?"↑":"↓"} {Math.abs(change).toFixed(1)}% vs prior week</small>}</div></div>
    <div role="tablist" aria-label="Website funnel trend metric" style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>{metrics.map(m=><button type="button" role="tab" aria-selected={metric===m.key} key={m.key} onClick={()=>setMetric(m.key)} style={{padding:"8px 11px",borderRadius:9,border:metric===m.key?"1px solid #4f7d47":"1px solid #d5ddd1",background:metric===m.key?"#eef6e9":"#fbfcfa",color:metric===m.key?"#245b25":"#596657",fontWeight:800,cursor:"pointer"}}>{m.label}</button>)}</div>
    <div style={{overflowX:"auto",width:"100%"}}><svg viewBox={`0 0 ${width} ${height}`} style={{display:"block",width:"100%",minWidth:680,height:"auto"}} role="img" aria-label={`${selected.label} weekly 7-day totals over the last 6 months`}>
      {[0,.25,.5,.75,1].map((fraction,i)=>{const y=padTop+plotH-fraction*plotH;return <g key={i}><line x1={padX} x2={width-padX} y1={y} y2={y} stroke="#e5eae2" strokeWidth="1"/><text x={padX-10} y={y+4} textAnchor="end" fill="#7a8578" fontSize="11">{Math.round(max*fraction).toLocaleString()}</text></g>})}
      <polyline points={polyline} fill="none" stroke="#315f32" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((p,i)=><g key={p.d.date}><circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#315f32" strokeWidth="2"><title>{`${p.d.label}: ${p.d[metric].toLocaleString()} ${selected.label}`}</title></circle>{(i%4===0||i===points.length-1)&&<text x={p.x} y={height-14} textAnchor="middle" fill="#6f7a6d" fontSize="11">{p.d.label}</text>}</g>)}
    </svg></div>
  </section>;
}
