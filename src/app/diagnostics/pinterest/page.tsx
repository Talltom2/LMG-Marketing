import Link from "next/link";
import { getPinterestConfigHealth } from "@/lib/integrations/pinterest/config-health";
import AutoFixButton from "../[channelId]/AutoFixButton";

export const dynamic="force-dynamic";
const color=(h:string)=>h==="RED"?"#dc2626":h==="YELLOW"?"#eab308":"#16a34a";
const findingHealth=(s:string)=>s==="CRITICAL"?"RED":s==="WARNING"||s==="WATCH"?"YELLOW":"GREEN";

export default async function PinterestDiagnostics(){
 const data=await getPinterestConfigHealth();
 return <main><header><p className="eyebrow">Laughing Moose Gifts</p><h1>Pinterest Diagnostics</h1><p className="subtitle">Configuration → catalog → content → traffic → conversion → corrective action</p><p><Link href="/diagnostics">← Diagnostic Center</Link></p></header>
 <section className="panel"><div><p className="eyebrow">Platform Health</p><h2>Pinterest Configuration</h2><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{width:22,height:22,borderRadius:"50%",background:color(data.health)}}/><strong>{data.health}</strong></div></div><div><p>Checks Pinterest API authorization, Business-account access, claimed LMG domain, ad-account availability, catalog/feed access, and boards/content organization.</p></div></section>
 <section className="panel" style={{display:"block"}}><p className="eyebrow">CONFIGURATION SETTINGS DIAGNOSIS</p><h2>Current Pinterest configuration</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14}}>{data.checks.map(c=><article className="module" key={c.key}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:14,height:14,borderRadius:"50%",background:color(c.health)}}/><strong>{c.label}</strong></div><p><strong>{c.value}</strong></p><small>{c.detail}</small></article>)}</div></section>
 <section className="panel" style={{display:"block"}}><p className="eyebrow">CONFIGURATION FINDINGS</p><h2>{data.findings.length?`${data.findings.length} issue${data.findings.length===1?"":"s"} identified`:"No configuration problems detected"}</h2><div style={{display:"grid",gap:10,marginTop:14}}>{data.findings.map((f,i)=>{const h=findingHealth(f.severity);return <article className="module" key={`${f.layer}-${i}`}><div style={{display:"flex",alignItems:"center",gap:9}}><span title={`${h} severity`} style={{width:16,height:16,borderRadius:"50%",background:color(h),display:"inline-block"}}/><p className="eyebrow" style={{margin:0}}>{f.layer.replaceAll("_"," ")} · {f.severity}</p></div><h3>{f.title}</h3><p><strong>Observation:</strong> {f.observation}</p><p><strong>Likely cause:</strong> {f.likelyCause}</p><p><strong>Recommended:</strong> {f.recommendation}</p><p><strong>Confidence:</strong> {Math.round(f.confidence*100)}%</p><AutoFixButton channelId={data.channelId} channelName={data.channelName} layer={f.layer} title={f.title} observation={f.observation} likelyCause={f.likelyCause} recommendation={f.recommendation} confidence={f.confidence}/></article>})}</div></section>
 </main>;
}
