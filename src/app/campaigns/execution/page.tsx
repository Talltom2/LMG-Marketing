"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type Action={id:string;actionType:string;description:string;executionTarget?:string|null;status?:string|null};
type Recommendation={id:string;title:string;status:string;actions:Action[]};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;products:{product:{sku:string;name:string}}[];recommendations:Recommendation[]};

const actionLabel:Record<string,string>={
  CALENDAR:"Calendar",
  CREATIVE_DRAFT:"Creative",
  SCHEDULE_EXECUTION:"Schedule / Execute",
  METRICS_REVIEW:"Measurement",
};

export default function CampaignExecutionPage(){
  const[campaigns,setCampaigns]=useState<Campaign[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/campaigns",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to load campaigns");
      setCampaigns(d.campaigns??[]);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load campaigns")}finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  const summary=useMemo(()=>{
    const total=campaigns.length;
    const planned=campaigns.filter(c=>c.status==="PLANNED").length;
    const actionCount=campaigns.reduce((n,c)=>n+c.recommendations.reduce((m,r)=>m+(r.actions?.length??0),0),0);
    return{total,planned,actionCount};
  },[campaigns]);

  return <main style={{maxWidth:1180,margin:"0 auto",padding:"34px 22px 60px",fontFamily:"Arial, sans-serif"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <p style={{margin:0,fontSize:12,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"#6b7280"}}>LMG Marketing · Campaign Operations</p>
        <h1 style={{fontSize:34,margin:"8px 0 8px"}}>Execution Readiness</h1>
        <p style={{maxWidth:760,margin:0,color:"#4b5563",lineHeight:1.55}}>This is the handoff between Campaign Builder planning and real execution. It shows exactly what the system created for each campaign: calendar timing, creative work, scheduling/execution tasks and measurement follow-up.</p>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Link href="/campaigns" style={{padding:"10px 14px",border:"1px solid #d1d5db",borderRadius:9,textDecoration:"none",color:"#111827",fontWeight:700}}>Back to Builder</Link>
        <button onClick={()=>void load()} style={{padding:"10px 14px",border:"1px solid #111827",borderRadius:9,background:"#111827",color:"white",fontWeight:700,cursor:"pointer"}}>Refresh status</button>
      </div>
    </div>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,margin:"26px 0"}}>
      <Stat label="Campaigns loaded" value={summary.total}/>
      <Stat label="Planned campaigns" value={summary.planned}/>
      <Stat label="Execution tasks" value={summary.actionCount}/>
      <Stat label="Workflow" value="Plan → Execute → Measure" small/>
    </section>

    {loading&&<div style={noticeStyle}>Loading execution state…</div>}
    {error&&<div style={{...noticeStyle,borderColor:"#fecaca",background:"#fef2f2",color:"#991b1b"}}>{error}</div>}
    {!loading&&!error&&!campaigns.length&&<div style={noticeStyle}>No campaigns yet. Build and approve a campaign first.</div>}

    <section style={{display:"grid",gap:18}}>
      {campaigns.map(c=>{
        const actions=c.recommendations.flatMap(r=>r.actions??[]);
        const actionTypes=new Set(actions.map(a=>a.actionType));
        const readiness=["CALENDAR","CREATIVE_DRAFT","SCHEDULE_EXECUTION","METRICS_REVIEW"].map(type=>({type,ready:actionTypes.has(type)}));
        const allReady=readiness.every(x=>x.ready);
        return <article key={c.id} style={{border:"1px solid #e5e7eb",borderRadius:14,padding:20,boxShadow:"0 2px 9px rgba(0,0,0,.04)",background:"white"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <h2 style={{margin:"0 0 6px",fontSize:22}}>{c.name}</h2>
              <div style={{fontSize:13,color:"#6b7280"}}>{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()} · {c.products.length} product{c.products.length===1?"":"s"}</div>
            </div>
            <span style={{padding:"6px 10px",borderRadius:999,fontSize:12,fontWeight:800,background:allReady?"#ecfdf5":"#fff7ed",color:allReady?"#065f46":"#9a3412"}}>{allReady?"EXECUTION HANDOFF READY":"INCOMPLETE HANDOFF"}</span>
          </div>

          {c.objective&&<p style={{color:"#374151",lineHeight:1.5,marginBottom:14}}>{c.objective}</p>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{c.products.map(p=><span key={p.product.sku} style={{fontSize:12,padding:"5px 8px",background:"#f3f4f6",borderRadius:7}}>{p.product.name} · {p.product.sku}</span>)}</div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginBottom:16}}>
            {readiness.map(x=><div key={x.type} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:12,background:x.ready?"#f0fdf4":"#fff7ed"}}>
              <div style={{fontSize:12,fontWeight:800,color:x.ready?"#166534":"#9a3412"}}>{x.ready?"READY":"MISSING"}</div>
              <div style={{fontWeight:700,marginTop:4}}>{actionLabel[x.type]??x.type}</div>
            </div>)}
          </div>

          <details>
            <summary style={{cursor:"pointer",fontWeight:800}}>Show generated execution tasks ({actions.length})</summary>
            <div style={{display:"grid",gap:8,marginTop:12}}>{actions.map((a,i)=><div key={a.id||`${a.actionType}:${i}`} style={{borderLeft:"3px solid #d1d5db",padding:"7px 10px"}}><strong>{actionLabel[a.actionType]??a.actionType}</strong><div style={{fontSize:13,color:"#4b5563",marginTop:3}}>{a.description}</div>{a.executionTarget&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Target: {a.executionTarget}</div>}</div>)}</div>
          </details>
        </article>
      })}
    </section>
  </main>;
}

function Stat({label,value,small=false}:{label:string;value:string|number;small?:boolean}){
  return <div style={{border:"1px solid #e5e7eb",borderRadius:12,padding:16,background:"#fafafa"}}><div style={{fontSize:12,color:"#6b7280",fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div><div style={{fontSize:small?16:28,fontWeight:800,marginTop:6}}>{value}</div></div>
}

const noticeStyle={border:"1px solid #dbeafe",background:"#eff6ff",color:"#1e3a8a",padding:14,borderRadius:10,marginBottom:18};
