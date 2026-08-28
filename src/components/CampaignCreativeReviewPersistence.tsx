"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";

type Status="REVIEW"|"APPROVED"|"EXCLUDED";
type CreativeState={
  id:string;
  channel:string;
  opportunity:string;
  version:number;
  status:Status;
  headline:string;
  cta:string;
  body:string;
  comment:string;
  isPaid:boolean;
  budget:number;
  visualValue:string;
  visualLabel:string;
  format:string;
  pinOverlay?:string;
  pinTitle?:string;
  pinDescription?:string;
};
type VisualChoice={label:string;url:string};

const ACTIVE_KEY="lmg-active-campaign-id";
const APPROVAL_KEY="lmg-campaign-approved-visuals-v1";

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function activeId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function cleanVisual(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function campaignName(){return Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find(l=>/^Campaign name/i.test(text(l)))?.querySelector<HTMLInputElement>("input")?.value.trim().toLowerCase()||"builder-draft"}
function approvedMap(){try{return JSON.parse(localStorage.getItem(APPROVAL_KEY)??"{}") as Record<string,string[]>}catch{return{}}}
function nativeSection(){return Array.from(document.querySelectorAll<HTMLElement>("#creative-approval")).find(s=>s.dataset.lmgRestoredCreative!=="1")??null}
function creativeSection(){return document.querySelector<HTMLElement>("#creative-approval")}
function step6(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="6")??null}
function parseStatus(value:string):Status{return /APPROVED/i.test(value)?"APPROVED":/EXCLUDED/i.test(value)?"EXCLUDED":"REVIEW"}
function parseVersion(value:string){const m=value.match(/v(\d+)/i);return m?Number(m[1]):1}

function capture(section:HTMLElement):CreativeState[]{
  return Array.from(section.querySelectorAll<HTMLElement>("article.creative-card")).map((card,index)=>{
    const channel=text(card.querySelector(".creative-card-head .eyebrow"));
    const opportunity=text(card.querySelector(".creative-card-head h3"));
    const versionText=text(card.querySelector(".creative-version"));
    const select=card.querySelector<HTMLSelectElement>("select");
    const copyInputs=Array.from(card.querySelectorAll<HTMLInputElement>(".creative-copy-edit input"));
    const body=card.querySelector<HTMLTextAreaElement>(".creative-copy-edit textarea");
    const comment=card.querySelector<HTMLTextAreaElement>(".revision-field textarea");
    const budget=card.querySelector<HTMLInputElement>(".budget-input input");
    const format=text(card.querySelector(".creative-spec")).replace(/^Format:\s*/i,"");
    return{
      id:`${channel||"channel"}::${opportunity||index}`,
      channel,opportunity,version:parseVersion(versionText),status:parseStatus(versionText),
      headline:copyInputs[0]?.value??"",cta:copyInputs[1]?.value??"",body:body?.value??"",comment:comment?.value??"",
      isPaid:!!budget,budget:Number(budget?.value||0),visualValue:select?.value??"",visualLabel:cleanVisual(select?.selectedOptions[0]?.textContent?.trim()??""),format,
      pinOverlay:card.querySelector<HTMLInputElement>("[data-pin-overlay]")?.value??"",
      pinTitle:card.querySelector<HTMLInputElement>("[data-pin-title]")?.value??"",
      pinDescription:card.querySelector<HTMLTextAreaElement>("[data-pin-description]")?.value??""
    };
  });
}

function visualChoices():VisualChoice[]{
  const library=Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="5A");
  if(!library)return[];
  const saved=new Set(approvedMap()[campaignName()]??[]),seen=new Set<string>(),out:VisualChoice[]=[];
  for(const card of Array.from(library.querySelectorAll<HTMLElement>("article.creative-card"))){
    const label=cleanVisual(text(card.querySelector("h3"))),status=text(card.querySelector(".creative-version")).toUpperCase(),img=card.querySelector<HTMLImageElement>(".creative-preview img");
    if(!label||!img?.src||(!status.includes("APPROVED")&&!saved.has(label))||seen.has(label))continue;
    seen.add(label);out.push({label,url:img.currentSrc||img.src});
  }
  return out;
}

export default function CampaignCreativeReviewPersistence(){
  const pathname=usePathname();
  const[target,setTarget]=useState<HTMLElement|null>(null);
  const[drafts,setDrafts]=useState<CreativeState[]>([]);
  const[restoreEnabled,setRestoreEnabled]=useState(false);
  const[hasNative,setHasNative]=useState(false);
  const[choices,setChoices]=useState<VisualChoice[]>([]);
  const saveTimer=useRef<number|undefined>(undefined);
  const lastSaved=useRef("");

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const id=activeId();if(!id)return;
    let cancelled=false,tries=0;

    const place=()=>{
      const six=step6();if(!six){if(++tries<100)window.setTimeout(place,100);return}
      let node=document.getElementById("lmg-restored-creative-target") as HTMLElement|null;
      if(!node){node=document.createElement("div");node.id="lmg-restored-creative-target";six.insertAdjacentElement("afterend",node)}
      if(!cancelled)setTarget(node);
    };
    place();

    const load=async()=>{
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{cache:"no-store"});if(!r.ok)return;
        const d=await r.json() as {state?:{creativeDrafts?:CreativeState[];planApproved?:boolean}};
        const saved=Array.isArray(d.state?.creativeDrafts)?d.state!.creativeDrafts!:[];
        if(cancelled)return;
        setDrafts(saved);setRestoreEnabled(d.state?.planApproved===true&&saved.length>0);lastSaved.current=JSON.stringify(saved);
      }catch{}
    };
    void load();

    const watch=window.setInterval(()=>{
      const native=nativeSection();
      setHasNative(!!native);
      setChoices(visualChoices());
      if(native&&native.querySelectorAll("article.creative-card").length){
        const current=capture(native),signature=JSON.stringify(current);
        if(!lastSaved.current){lastSaved.current=signature;setDrafts(current)}
      }
    },500);

    return()=>{cancelled=true;window.clearInterval(watch)};
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const id=activeId();if(!id)return;

    const persist=async(section:HTMLElement)=>{
      const current=capture(section),signature=JSON.stringify(current);if(!current.length||signature===lastSaved.current)return;
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:{creativeDrafts:current,planApproved:true}})});
        if(r.ok){lastSaved.current=signature;setDrafts(current);setRestoreEnabled(true)}
      }catch{}
    };

    const schedule=(event:Event)=>{
      const section=(event.target as HTMLElement|null)?.closest<HTMLElement>("#creative-approval")??creativeSection();if(!section)return;
      if(saveTimer.current)window.clearTimeout(saveTimer.current);
      saveTimer.current=window.setTimeout(()=>void persist(section),300);
    };
    document.addEventListener("input",schedule,true);document.addEventListener("change",schedule,true);document.addEventListener("click",schedule,true);
    return()=>{if(saveTimer.current)window.clearTimeout(saveTimer.current);document.removeEventListener("input",schedule,true);document.removeEventListener("change",schedule,true);document.removeEventListener("click",schedule,true)};
  },[pathname]);

  const choiceByLabel=useMemo(()=>new Map(choices.map(c=>[c.label,c])),[choices]);

  function update(id:string,patch:Partial<CreativeState>){setDrafts(current=>current.map(d=>d.id===id?{...d,...patch}:d))}
  function regenerate(id:string){setDrafts(current=>current.map(d=>d.id===id?{...d,version:d.version+1,status:"REVIEW",body:d.comment?`${d.body}\n\nRequested revision: ${d.comment}`:d.body,comment:""}:d))}

  if(pathname!=="/campaigns"||!target||hasNative||!restoreEnabled||!drafts.length)return null;

  return createPortal(<section id="creative-approval" data-lmg-restored-creative="1" className="campaign-stage-panel creative-approval-panel"><div className="stage-heading"><span>7</span><div><p className="eyebrow">Creative approval · Restored saved review</p><h2>Review visual + copy and authorize each opportunity creative</h2></div></div><p className="approval-note">This creative review was restored from the campaign's persistent builder state. Edits, approvals, exclusions, image choices and budgets continue to autosave.</p><div className="creative-card-grid">{drafts.map(d=>{const selectedLabel=d.visualLabel||d.visualValue,choice=choiceByLabel.get(selectedLabel);return <article className={`creative-card status-${d.status.toLowerCase()}`} key={d.id}><div className="creative-card-head"><div><span className="eyebrow">{d.channel}</span><h3>{d.opportunity}</h3></div><span className="creative-version">v{d.version} · {d.status}</span></div>{choice?.url?<div className="creative-preview"><img src={choice.url} alt={choice.label} style={{width:"100%",height:"auto",borderRadius:12}}/></div>:<div className="creative-preview"><strong>{selectedLabel?"Saved campaign visual":"No visual selected yet"}</strong><p>{selectedLabel||"Choose an approved asset from the Campaign Visual Library."}</p></div>}<div className="creative-preview"><strong>{d.headline}</strong><p>{d.body}</p><button type="button">{d.cta}</button></div><p className="creative-spec"><strong>Format:</strong> {d.format||"Campaign-ready creative"}</p><label>Campaign visual<select value={selectedLabel} onChange={e=>update(d.id,{visualValue:e.target.value,visualLabel:e.target.value,status:"REVIEW"})}><option value="">Choose visual</option>{choices.map(v=><option value={v.label} key={v.label}>{v.label} · APPROVED</option>)}</select></label>{d.isPaid?<div className="budget-authorization"><label><strong>Approved opportunity budget</strong><span className="budget-input"><b>$</b><input type="number" min="0" step="1" value={d.budget||""} onChange={e=>update(d.id,{budget:Number(e.target.value),status:"REVIEW"})} placeholder="Enter budget"/></span></label><small>Approving this opportunity authorizes spend up to this amount on {d.channel}.</small></div>:<div className="publication-authorization"><strong>Publication authorization</strong><small>Approving this creative authorizes LMG Marketing to schedule and publish this specific opportunity.</small></div>}<div className="creative-copy-edit"><label>Headline<input value={d.headline} onChange={e=>update(d.id,{headline:e.target.value,status:"REVIEW"})}/></label><label>CTA<input value={d.cta} onChange={e=>update(d.id,{cta:e.target.value,status:"REVIEW"})}/></label><label className="editor-wide">Body copy<textarea rows={4} value={d.body} onChange={e=>update(d.id,{body:e.target.value,status:"REVIEW"})}/></label></div><label className="revision-field">Request a specific change<textarea rows={3} value={d.comment} onChange={e=>update(d.id,{comment:e.target.value})}/></label><div className="creative-actions"><button type="button" className="primary-button" disabled={(d.isPaid&&d.budget<=0)||!selectedLabel} onClick={()=>update(d.id,{status:"APPROVED"})}>{d.isPaid?`Approve Visual + Copy & Authorize $${d.budget.toFixed(0)} Spend`:"Approve Visual + Copy & Authorize Publication"}</button><button type="button" className="button-outline" onClick={()=>regenerate(d.id)}>Regenerate Copy with Changes</button><button type="button" className="button-muted" onClick={()=>update(d.id,{status:"EXCLUDED"})}>Exclude</button></div>{!selectedLabel&&<p className="gate-blocker">Choose a campaign visual before final approval.</p>}{d.isPaid&&d.budget<=0&&<p className="gate-blocker">Enter the paid-media budget to activate approval.</p>}{d.status==="APPROVED"&&<p className="status-message"><strong>✓ Visual + copy authorized for scheduling{d.isPaid?` and up to $${d.budget.toFixed(2)} in spend`:" and publication"}.</strong></p>}</article>})}</div><div className="creative-summary"><strong>{drafts.filter(d=>d.status==="APPROVED").length} authorized</strong><span>{drafts.filter(d=>d.status==="REVIEW").length} awaiting review</span><span>{drafts.filter(d=>d.status==="EXCLUDED").length} excluded</span><span>Total paid-media authorization: ${drafts.filter(d=>d.status==="APPROVED"&&d.isPaid).reduce((sum,d)=>sum+d.budget,0).toFixed(2)}</span></div><button className="primary-button" disabled={!drafts.some(d=>d.status==="APPROVED")||drafts.some(d=>d.status==="REVIEW")}>Continue to Step 8 · Schedule Authorized Opportunities</button></section>,target);
}
