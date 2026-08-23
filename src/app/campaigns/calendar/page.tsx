"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignAction={id:string;actionType:string;description:string;executionTarget?:string|null;completed:boolean};
type CampaignRecommendation={id:string;title:string;actions:CampaignAction[]};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;products:{product:{sku:string;name:string}}[];recommendations:CampaignRecommendation[]};
type CalendarItem={id:string;campaignId:string;campaignName:string;date:string;kind:"START"|"END"|"CHANNEL"|"CREATIVE"|"REVIEW"|"CLOSEOUT";label:string};

const monthLabel=(d:Date)=>d.toLocaleDateString("en-US",{month:"long",year:"numeric"});
const iso=(d:Date)=>d.toISOString().slice(0,10);
const dateOnly=(value:string)=>value.slice(0,10);
const addDays=(value:string,days:number)=>{const d=new Date(`${dateOnly(value)}T12:00:00`);d.setDate(d.getDate()+days);return iso(d)};
const midDate=(start:string,end:string)=>{const a=new Date(`${dateOnly(start)}T12:00:00`).getTime(),b=new Date(`${dateOnly(end)}T12:00:00`).getTime();return iso(new Date(a+(b-a)/2))};
const looksLikeDate=(value?:string|null)=>!!value&&/^\d{4}-\d{2}-\d{2}/.test(value);
const statusFor=(campaign:Campaign)=>{const today=iso(new Date()),start=dateOnly(campaign.startDate),end=dateOnly(campaign.endDate),raw=campaign.status.toUpperCase();if(raw==="PAUSED")return"PAUSED";if(raw==="COMPLETED")return"COMPLETED";if(raw==="ACTIVE")return"ACTIVE";if(start>today)return"SCHEDULED";if(end<today)return"COMPLETED";return"PLANNED"};

export default function CampaignCalendarPage(){
  const[campaigns,setCampaigns]=useState<Campaign[]>([]),[loading,setLoading]=useState(true),[viewDate,setViewDate]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)}),[filter,setFilter]=useState("ALL"),[updating,setUpdating]=useState<string|null>(null),[notice,setNotice]=useState("");
  const refresh=()=>fetch("/api/campaigns",{cache:"no-store"}).then(r=>r.json()).then(d=>setCampaigns(d.campaigns??[]));
  useEffect(()=>{refresh().finally(()=>setLoading(false))},[]);

  const items=useMemo<CalendarItem[]>(()=>campaigns.flatMap(c=>{
    const base:CalendarItem[]=[
      {id:`${c.id}-creative`,campaignId:c.id,campaignName:c.name,date:addDays(c.startDate,-2),kind:"CREATIVE",label:"Creative review & final approval"},
      {id:`${c.id}-start`,campaignId:c.id,campaignName:c.name,date:dateOnly(c.startDate),kind:"START",label:"Campaign starts"},
      {id:`${c.id}-review`,campaignId:c.id,campaignName:c.name,date:midDate(c.startDate,c.endDate),kind:"REVIEW",label:"Mid-campaign performance review"},
      {id:`${c.id}-end`,campaignId:c.id,campaignName:c.name,date:dateOnly(c.endDate),kind:"END",label:"Campaign ends"},
      {id:`${c.id}-closeout`,campaignId:c.id,campaignName:c.name,date:addDays(c.endDate,1),kind:"CLOSEOUT",label:"Closeout, diagnostics & learning"}
    ];
    c.recommendations?.forEach(rec=>rec.actions?.forEach(a=>{
      if(a.actionType==="CALENDAR"&&looksLikeDate(a.executionTarget))base.push({id:a.id,campaignId:c.id,campaignName:c.name,date:dateOnly(String(a.executionTarget)),kind:"CHANNEL",label:a.description});
      else if(a.actionType==="SCHEDULE_EXECUTION"&&looksLikeDate(a.executionTarget))base.push({id:a.id,campaignId:c.id,campaignName:c.name,date:dateOnly(String(a.executionTarget)),kind:"CHANNEL",label:a.description});
      else if(a.actionType==="METRICS_REVIEW"&&looksLikeDate(a.executionTarget))base.push({id:a.id,campaignId:c.id,campaignName:c.name,date:dateOnly(String(a.executionTarget)),kind:"REVIEW",label:a.description});
    }));
    return base;
  }),[campaigns]);

  const days=useMemo(()=>{const y=viewDate.getFullYear(),m=viewDate.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})},[viewDate]);
  const grouped=useMemo(()=>new Map(days.map(d=>[iso(d),items.filter(i=>i.date===iso(d))])),[days,items]);
  const rows=useMemo(()=>campaigns.map(c=>({...c,derivedStatus:statusFor(c)})).filter(c=>filter==="ALL"||c.derivedStatus===filter),[campaigns,filter]);
  const counts=useMemo(()=>campaigns.reduce<Record<string,number>>((acc,c)=>{const s=statusFor(c);acc[s]=(acc[s]||0)+1;return acc},{}),[campaigns]);
  const shiftMonth=(n:number)=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()+n,1));
  async function setStatus(campaign:Campaign,status:"PLANNED"|"ACTIVE"|"PAUSED"|"COMPLETED"){setUpdating(campaign.id);setNotice("");try{const r=await fetch(`/api/campaigns/${campaign.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to update campaign.");setCampaigns(list=>list.map(c=>c.id===campaign.id?d.campaign:c));setNotice(`${campaign.name} is now ${status.toLowerCase()}.`)}catch(e){setNotice(e instanceof Error?e.message:"Unable to update campaign.")}finally{setUpdating(null)}}

  return <main className="campaign-ops-shell">
    <header className="ops-header"><div><p className="eyebrow">Laughing Moose Gifts · LMG Marketing</p><h1>Campaign Calendar & Operations</h1><p>Master view of campaigns, promotional timing, approvals, launch activity, performance reviews and closeout work.</p></div><div className="ops-header-actions"><Link className="button-outline" href="/campaigns">Build New Campaign</Link><Link href="/">Marketing Intelligence</Link></div></header>
    <section className="ops-summary-grid">{["ACTIVE","SCHEDULED","PLANNED","PAUSED","COMPLETED"].map(s=><button key={s} className={`ops-summary-card ${filter===s?"selected":""}`} onClick={()=>setFilter(filter===s?"ALL":s)}><strong>{counts[s]||0}</strong><span>{s}</span></button>)}</section>
    <section className="ops-calendar-panel"><div className="calendar-toolbar"><div><p className="eyebrow">Master calendar</p><h2>{monthLabel(viewDate)}</h2></div><div><button className="button-muted" onClick={()=>shiftMonth(-1)}>← Previous</button><button className="button-muted" onClick={()=>setViewDate(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Today</button><button className="button-muted" onClick={()=>shiftMonth(1)}>Next →</button></div></div><div className="calendar-legend"><span className="legend-creative">Creative approval</span><span className="legend-channel">Channel activity</span><span className="legend-start">Campaign start</span><span className="legend-review">Performance review</span><span className="legend-end">Campaign end</span><span className="legend-closeout">Closeout / learning</span></div><div className="calendar-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><strong key={d}>{d}</strong>)}</div><div className="master-calendar-grid">{days.map(d=>{const key=iso(d),outside=d.getMonth()!==viewDate.getMonth(),today=key===iso(new Date()),dayItems=grouped.get(key)??[];return <div className={`calendar-day ${outside?"outside":""} ${today?"today":""}`} key={key}><span className="calendar-day-number">{d.getDate()}</span><div className="calendar-events">{dayItems.slice(0,6).map(i=><div key={i.id} className={`calendar-event event-${i.kind.toLowerCase()}`} title={`${i.campaignName}: ${i.label}`}><strong>{i.campaignName}</strong><span>{i.label}</span></div>)}{dayItems.length>6&&<small>+{dayItems.length-6} more</small>}</div></div>})}</div></section>
    <section className="campaign-list-panel"><div className="campaign-list-heading"><div><p className="eyebrow">Campaign list</p><h2>Active, scheduled and planned campaigns</h2></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All statuses</option><option>ACTIVE</option><option>SCHEDULED</option><option>PLANNED</option><option>PAUSED</option><option>COMPLETED</option></select></div>{notice&&<p className="ops-notice">{notice}</p>}{loading?<p>Loading campaigns…</p>:rows.length===0?<div className="collection-empty">No campaigns match this view.</div>:<div className="campaign-ops-table-wrap"><table className="campaign-ops-table"><thead><tr><th>Status</th><th>Campaign</th><th>Products</th><th>Start</th><th>End</th><th>Key calendar activities</th><th>Controls</th></tr></thead><tbody>{rows.map(c=>{const activities=items.filter(i=>i.campaignId===c.id).length,busy=updating===c.id;return <tr key={c.id}><td><span className={`ops-status status-${c.derivedStatus.toLowerCase()}`}>{c.derivedStatus}</span></td><td><strong>{c.name}</strong><small>{c.objective||"No objective recorded"}</small></td><td>{c.products.length}<small>{c.products.slice(0,2).map(p=>p.product.name).join(", ")}{c.products.length>2?"…":""}</small></td><td>{dateOnly(c.startDate)}</td><td>{dateOnly(c.endDate)}</td><td><strong>{activities}</strong><small>approvals, launches, reviews and closeout milestones</small></td><td><div className="ops-controls">{c.derivedStatus!=="ACTIVE"&&c.derivedStatus!=="COMPLETED"&&<button disabled={busy} onClick={()=>setStatus(c,"ACTIVE")}>Start</button>}{c.derivedStatus==="ACTIVE"&&<button disabled={busy} onClick={()=>setStatus(c,"PAUSED")}>Pause</button>}{c.derivedStatus==="PAUSED"&&<button disabled={busy} onClick={()=>setStatus(c,"ACTIVE")}>Resume</button>}{c.derivedStatus!=="COMPLETED"&&<button disabled={busy} className="end" onClick={()=>setStatus(c,"COMPLETED")}>End</button>}<Link href="/campaigns">Open</Link></div></td></tr>})}</tbody></table></div>}</section>
    <section className="ops-next-build"><p className="eyebrow">Build sequence</p><h2>Prioritized remaining components</h2><div className="ops-roadmap"><span className="done">1 · Calendar + campaign list</span><span className="done">2 · Execution/status controls</span><span>3 · Campaign metrics dashboard</span><span>4 · Diagnostic feedback + optimization</span><span>5 · Closeout + learning</span><span>6 · Notifications/exceptions</span><span>7 · Remaining channel + creative connectors</span></div></section>
  </main>;
}
