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

  return <section className="funnel-trend-card">
    <div className="funnel-trend-heading"><div><h2>6-Month Funnel Trend</h2><p>Each point represents a complete 7-day total, allowing week-over-week comparison of the funnel metrics above.</p></div><div className="funnel-trend-summary"><strong>{latest.toLocaleString()}</strong><span>latest 7-day {selected.label.toLowerCase()}</span>{change!==null&&<small className={change>=0?"trend-up":"trend-down"}>{change>=0?"↑":"↓"} {Math.abs(change).toFixed(1)}% vs prior week</small>}</div></div>
    <div className="funnel-trend-tabs" role="tablist" aria-label="Website funnel trend metric">{metrics.map(m=><button type="button" role="tab" aria-selected={metric===m.key} className={metric===m.key?"active":""} key={m.key} onClick={()=>setMetric(m.key)}>{m.label}</button>)}</div>
    <div className="funnel-chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${selected.label} weekly 7-day totals over the last 6 months`}>
      {[0,.25,.5,.75,1].map((fraction,i)=>{const y=padTop+plotH-fraction*plotH;return <g key={i}><line className="funnel-grid-line" x1={padX} x2={width-padX} y1={y} y2={y}/><text className="funnel-axis-label" x={padX-10} y={y+4} textAnchor="end">{Math.round(max*fraction).toLocaleString()}</text></g>})}
      <polyline className="funnel-trend-line" points={polyline}/>
      {points.map((p,i)=><g key={p.d.date}><circle className="funnel-trend-dot" cx={p.x} cy={p.y} r="4"><title>{`${p.d.label}: ${p.d[metric].toLocaleString()} ${selected.label}`}</title></circle>{(i%4===0||i===points.length-1)&&<text className="funnel-date-label" x={p.x} y={height-14} textAnchor="middle">{p.d.label}</text>}</g>)}
    </svg></div>
  </section>;
}
