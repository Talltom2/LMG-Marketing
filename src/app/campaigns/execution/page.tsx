"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type Action={id:string;actionType:string;description:string;executionTarget?:string|null;completed?:boolean};
type Recommendation={id:string;title:string;status:string;actions:Action[]};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;createdAt?:string;products:{product:{sku:string;name:string}}[];recommendations:Recommendation[]};
type CampaignInstance=Campaign&{sourceIds:string[];actions:Action[]};

const phaseOrder=["CALENDAR","CREATIVE_DRAFT","SCHEDULE_EXECUTION","METRICS_REVIEW"] as const;
const actionLabel:Record<string,string>={
  CALENDAR:"Calendar",
  CREATIVE_DRAFT:"Creative",
  SCHEDULE_EXECUTION:"Schedule / Execute",
  METRICS_REVIEW:"Measurement",
};

function instanceKey(c:Campaign){
  const skus=c.products.map(p=>p.product.sku).sort().join(",");
  return [c.name.trim().toLowerCase(),c.startDate.slice(0,10),skus].join("|");
}

function actionKey(a:Action){return [a.actionType,a.executionTarget??"",a.description].join("|")}

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

  const instances=useMemo(()=>{
    const grouped=new Map<string,CampaignInstance>();
    for(const c of campaigns){
      const key=instanceKey(c);
      const currentActions=c.recommendations.flatMap(r=>r.actions??[]);
      const existing=grouped.get(key);
      if(!existing){
        grouped.set(key,{...c,sourceIds:[c.id],actions:currentActions});
        continue;
      }
      const existingTime=existing.createdAt?new Date(existing.createdAt).getTime():0;
      const currentTime=c.createdAt?new Date(c.createdAt).getTime():0;
      const base=currentTime>=existingTime?c:existing;
      const mergedActions=[...existing.actions,...currentActions].filter((a,i,all)=>all.findIndex(x=>actionKey(x)===actionKey(a))===i);
      grouped.set(key,{...base,sourceIds:[...existing.sourceIds,c.id],actions:mergedActions});
    }
    return [...grouped.values()].sort((a,b)=>(b.createdAt??"").localeCompare(a.createdAt??""));
  },[campaigns]);

  const summary=useMemo(()=>{
    const total=instances.length;
    const ready=instances.filter(c=>phaseOrder.every(type=>c.actions.some(a=>a.actionType===type))).length;
    return{total,ready,pending:total-ready};
  },[instances]);

  return <main style={{maxWidth:1180,margin:"0 auto",padding:"34px 22px 60px",fontFamily:"Arial, sans-serif"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div>
        <p style={{margin:0,fontSize:12,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:"#6b7280"}}>LMG Marketing · Campaign Operations</p>
        <h1 style={{fontSize:34,margin:"8px 0 8px"}}>Execution Readiness</h1>
        <p style={{maxWidth:800,margin:0,color:"#4b5563",lineHeight:1.55}}>One campaign instance equals one execution record. Channel and opportunity work is grouped inside that execution instead of appearing as repeated top-level tasks.</p>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Link href="/campaigns" style={{padding:"10px 14px",border:"1px solid #d1d5db",borderRadius:9,textDecoration:"none",color:"#111827",fontWeight:700}}>Back to Builder</Link>
        <button onClick={()=>void load()} style={{padding:"10px 14px",border:"1px solid #111827",borderRadius:9,background:"#111827",color:"white",fontWeight:700,cursor:"pointer"}}>Refresh status</button>
      </div>
    </div>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,margin:"26px 0"}}>
      <Stat label="Execution records" value={summary.total}/>
      <Stat label="Ready" value={summary.ready}/>
      <Stat label="Pending" value={summary.pending}/>
      <Stat label="Workflow" value="Plan → Execute → Measure" small/>
    </section>

    {loading&&<div style={noticeStyle}>Loading execution state…</div>}
    {error&&<div style={{...noticeStyle,borderColor:"#fecaca",background:"#fef2f2",color:"#991b1b"}}>{error}</div>}
    {!loading&&!error&&!instances.length&&<div style={noticeStyle}>No campaigns yet. Build and approve a campaign first.</div>}

    <section style={{display:"grid",gap:18}}>
      {instances.map(c=>{
        const readiness=phaseOrder.map(type=>({type,ready:c.actions.some(a=>a.actionType===type)}));
        const allReady=readiness.every(x=>x.ready);
        return <article key={instanceKey(c)} style={{border:"1px solid #e5e7eb",borderRadius:14,padding:20,boxShadow:"0 2px 9px rgba(0,0,0,.04)",background:"white"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <h2 style={{margin:"0 0 6px",fontSize:22}}>{c.name}</h2>
              <div style={{fontSize:13,color:"#6b7280"}}>{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()} · {c.products.length} product{c.products.length===1?"":"s"}</div>
              {c.sourceIds.length>1&&<div style={{fontSize:12,color:"#92400e",marginTop:5}}>Consolidated {c.sourceIds.length} planning saves into this single execution record.</div>}
            </div>
            <span style={{padding:"6px 10px",borderRadius:999,fontSize:12,fontWeight:800,background:allReady?"#ecfdf5":"#fff7ed",color:allReady?"#065f46":"#9a3412"}}>{allReady?"EXECUTION READY":"INCOMPLETE"}</span>
          </div>

          {c.objective&&<p style={{color:"#374151",lineHeight:1.5,marginBottom:14}}>{c.objective}</p>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{c.products.map(p=><span key={p.product.sku} style={{fontSize:12,padding:"5px 8px",background:"#f3f4f6",borderRadius:7}}>{p.product.name} · {p.product.sku}</span>)}</div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginBottom:16}}>
            {readiness.map(x=>{
              const phaseActions=c.actions.filter(a=>a.actionType===x.type);
              const targets=[...new Set(phaseActions.map(a=>a.executionTarget).filter(Boolean))] as string[];
              return <div key={x.type} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:12,background:x.ready?"#f0fdf4":"#fff7ed"}}>
                <div style={{fontSize:12,fontWeight:800,color:x.ready?"#166534":"#9a3412"}}>{x.ready?"READY":"MISSING"}</div>
                <div style={{fontWeight:700,marginTop:4}}>{actionLabel[x.type]??x.type}</div>
                {targets.length>0&&<div style={{fontSize:12,color:"#6b7280",marginTop:5}}>{targets.length} channel/opportunity target{targets.length===1?"":"s"}</div>}
              </div>
            })}
          </div>

          <details>
            <summary style={{cursor:"pointer",fontWeight:800}}>Show execution detail</summary>
            <div style={{display:"grid",gap:10,marginTop:12}}>{phaseOrder.map(type=>{
              const phaseActions=c.actions.filter(a=>a.actionType===type);
              const targets=[...new Set(phaseActions.map(a=>a.executionTarget).filter(Boolean))] as string[];
              return <div key={type} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 12px"}}>
                <strong>{actionLabel[type]}</strong>
                {targets.length>0?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:7}}>{targets.map(t=><span key={t} style={{fontSize:12,padding:"4px 7px",background:"#f3f4f6",borderRadius:999}}>{t}</span>)}</div>:<div style={{fontSize:13,color:"#9a3412",marginTop:5}}>Not yet generated.</div>}
              </div>
            })}</div>
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
