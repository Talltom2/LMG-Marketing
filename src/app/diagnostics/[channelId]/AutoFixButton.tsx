"use client";

import { useState } from "react";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type Props = { channelId:string; channelName:string; layer:string; title:string; observation:string; likelyCause:string; recommendation:string; confidence:number; };

function assessRisk(props: Props): { level: RiskLevel; risks: string[]; reversible: string; scope: string } {
  const layer = props.layer.toUpperCase();
  if (["OFFER", "CATALOG_HEALTH"].includes(layer)) return { level:"HIGH", risks:["Could affect listing eligibility, suppression, pricing, Buy Box/offer status, fulfillment, or marketplace policy compliance.","A bulk or incorrect update could affect multiple SKUs and account performance."], reversible:"Depends on the platform action; original values should be retained for rollback where APIs permit.", scope:"Potentially listings, offers, inventory/fulfillment settings, and marketplace account health." };
  if (["CONVERSION", "CREATIVE"].includes(layer)) return { level:"MODERATE", risks:["Content or offer changes may reduce conversion if the diagnosis is wrong.","Marketplace content edits can trigger validation or review."], reversible:"Usually reversible by restoring the previous content or offer configuration.", scope:"Affected product pages, creative, campaigns, or offers." };
  if (["VISIBILITY", "TRAFFIC"].includes(layer)) return { level:"MODERATE", risks:["Changes to feeds, campaigns, bids, targeting, or discoverability settings can alter traffic and spend.","Incorrect corrections may reduce exposure rather than improve it."], reversible:"Generally reversible, although performance effects may persist temporarily.", scope:"Traffic sources, feeds, campaigns, search exposure, and affected SKUs." };
  return { level:"LOW", risks:["The proposed correction is primarily diagnostic/operational, but inaccurate changes can still affect reporting or downstream decisions."], reversible:"Expected to be reversible or safely stoppable.", scope:"Diagnostic data and the specifically identified channel configuration." };
}

export default function AutoFixButton(props: Props) {
  const [status,setStatus]=useState<"idle"|"review"|"working"|"queued"|"error">("idle");
  const [message,setMessage]=useState("");
  const risk=assessRisk(props);
  async function approve(){ setStatus("working"); setMessage(""); try { const response=await fetch("/api/diagnostics/auto-fix",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...props,riskLevel:risk.level,riskSummary:risk.risks.join(" "),affectedScope:risk.scope,reversibility:risk.reversible})}); const body=await response.json(); if(!response.ok) throw new Error(body?.message??"Unable to queue correction."); setStatus("queued"); setMessage(body.message??"Correction approved and queued."); } catch(error){setStatus("error");setMessage(error instanceof Error?error.message:"Unable to queue correction.");}}
  if(status==="review") return <div style={{marginTop:16,padding:16,border:"2px solid currentColor",borderRadius:10}}><p className="eyebrow">Approval Required · {risk.level} RISK</p><h4>Review before LMG Marketing makes changes</h4><p><strong>Proposed action:</strong> {props.recommendation}</p><p><strong>Expected benefit:</strong> Correct the diagnosed {props.layer.replaceAll("_"," ").toLowerCase()} problem and restore performance toward the expected baseline.</p><p><strong>Diagnostic confidence:</strong> {(props.confidence*100).toFixed(0)}%</p><p><strong>Affected scope:</strong> {risk.scope}</p><p><strong>What could go wrong:</strong></p><ul>{risk.risks.map(r=><li key={r}>{r}</li>)}</ul><p><strong>Reversibility:</strong> {risk.reversible}</p>{(risk.level==="HIGH"||risk.level==="CRITICAL")&&<p><strong>Human approval is mandatory.</strong> High-risk platform actions are never silently auto-executed.</p>}<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" onClick={approve} style={{padding:"10px 14px",borderRadius:8,fontWeight:700}}>Approve & Execute</button><button type="button" onClick={()=>setStatus("idle")} style={{padding:"10px 14px",borderRadius:8}}>Cancel</button></div></div>;
  return <div style={{marginTop:16}}><button type="button" onClick={()=>setStatus("review")} disabled={status==="working"||status==="queued"} style={{padding:"10px 14px",borderRadius:8,border:"1px solid currentColor",fontWeight:700}}>{status==="working"?"Preparing fix…":status==="queued"?"Fix approved ✓":"Fix Automatically"}</button>{message&&<p style={{marginTop:8}}><small>{message}</small></p>}</div>;
}
