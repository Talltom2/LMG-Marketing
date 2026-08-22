import Link from "next/link";
import { runDiagnosticEngine, type DiagnosticSeverity } from "@/lib/intelligence/diagnostics";
import { getWalmartDiagnosticSnapshot } from "@/lib/integrations/walmart/diagnostics";
import { evaluateWalmartSnapshot } from "@/lib/integrations/walmart/evaluate";
import { getWooDiagnosticSnapshot } from "@/lib/integrations/woocommerce/diagnostics";
import { evaluateWooSnapshot } from "@/lib/integrations/woocommerce/evaluate";

export const dynamic = "force-dynamic";
const severityLabel: Record<DiagnosticSeverity,string>={CRITICAL:"Critical",WARNING:"Warning",WATCH:"Watch",HEALTHY:"Healthy",DATA_GAP:"Data gap"};
const pct=(v:number|null)=>v==null?"—":`${v>=0?"+":""}${(v*100).toFixed(0)}%`;
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v);
function trafficState(s:DiagnosticSeverity){if(s==="CRITICAL")return"RED";if(s==="HEALTHY")return"GREEN";return"YELLOW";}
function TrafficLight({severity}:{severity:DiagnosticSeverity}){const state=trafficState(severity);const dot=(c:"RED"|"YELLOW"|"GREEN",b:string)=><span aria-hidden="true" style={{width:18,height:18,borderRadius:"50%",display:"inline-block",background:state===c?b:"#d1d5db",border:"1px solid rgba(0,0,0,.12)"}}/>;return <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>{dot("RED","#dc2626")}{dot("YELLOW","#eab308")}{dot("GREEN","#16a34a")}<strong style={{marginLeft:4}}>{state}</strong></div>}

export default async function DiagnosticsPage(){
 const report=await runDiagnosticEngine(7); let walmartNative:any=null;let wooNative:any=null;
 try { const snapshot=await getWalmartDiagnosticSnapshot(); walmartNative={snapshot,evaluation:evaluateWalmartSnapshot(snapshot)}; } catch {}
 try { const snapshot=await getWooDiagnosticSnapshot(); wooNative={snapshot,evaluation:evaluateWooSnapshot(snapshot)}; } catch {}
 const actionable=report.findings.filter(f=>f.severity!=="HEALTHY");
 return <main><header><p className="eyebrow">Laughing Moose Gifts</p><h1>Diagnostic Center</h1><p className="subtitle">Expected → Actual → Anomaly → Cause → Recommendation → Corrective Action → Learning</p><p><Link href="/">← Marketing Intelligence</Link></p></header>
 <section className="panel"><div><p className="eyebrow">Diagnostic Engine</p><h2>What needs attention?</h2></div><div className="empty-state"><strong>{actionable.length+(walmartNative?.evaluation?.findings?.filter((f:any)=>f.severity!=="HEALTHY").length??0)+(wooNative?.evaluation?.findings?.filter((f:any)=>f.severity!=="HEALTHY").length??0)} diagnostic signals detected</strong><p>Click any platform card to open that platform’s detailed diagnostics in a separate browser window/tab. Green = healthy, Yellow = watch/warning/data gap, Red = critical.</p></div></section>
 <section className="modules">{report.channels.map(channel=>{const isWalmart=/walmart/i.test(channel.channelName);const isWebsite=/website|woocommerce|laughing moose gifts site/i.test(channel.channelName);const nativeSeverity=(isWalmart&&walmartNative?.evaluation?.health?walmartNative.evaluation.health:isWebsite&&wooNative?.evaluation?.health?wooNative.evaluation.health:channel.health) as DiagnosticSeverity;return <Link href={`/diagnostics/${encodeURIComponent(channel.channelId)}`} target="_blank" rel="noopener noreferrer" key={channel.channelId} style={{color:"inherit",textDecoration:"none",display:"block"}}><article className="module" style={{height:"100%",cursor:"pointer"}}><TrafficLight severity={nativeSeverity}/><p className="eyebrow">{severityLabel[nativeSeverity]}</p><h3>{channel.channelName}</h3><p><strong>{money(channel.currentRevenue)}</strong> current revenue<br/>{pct(channel.revenueDeltaPct)} vs. prior 7 days</p><p>{channel.currentUnits} units · {pct(channel.unitDeltaPct)} vs. baseline</p>{isWalmart&&walmartNative?<p><strong>Native Walmart telemetry live</strong><br/>{walmartNative.snapshot.catalog.total} catalog items · {walmartNative.snapshot.offer.total} pricing insights</p>:isWebsite&&wooNative?<p><strong>Native WooCommerce telemetry live</strong><br/>{wooNative.snapshot.catalog.published} published products · {wooNative.snapshot.sales.orders7} orders/7d · traffic analytics pending</p>:<p>{channel.currentSessions?`${channel.currentSessions} sessions`:"Traffic telemetry unavailable"}</p>}<p><strong>Open diagnostics ↗</strong></p></article></Link>})}</section></main>;
}
