"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";

type Action={actionType?:string;description?:string};
type Recommendation={title?:string;actions?:Action[]};
type BuilderState={templateName?:string;productSkus?:string[];activeAssets?:string[];opportunities?:Record<string,string[]>;headline?:string;cta?:string;coreMessage?:string};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;theme?:string|null;products?:{product:{sku:string;name:string}}[];recommendations?:Recommendation[]};

type ResumePayload={campaignId:string;opportunities:Record<string,string[]>};

const ACTIVE_KEY="lmg-active-campaign-id";
const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_OPPS_KEY="lmg-campaign-resume-opportunities-v1";
const STATE_PREFIX="LMG_BUILDER_STATE:";
const closed=new Set(["COMPLETED","CLOSED","CANCELLED","CANCELED","STOPPED"]);

const assetToChannel:Record<string,string>={
  "Website Homepage":"WEBSITE_HOMEPAGE",
  "WooCommerce Store":"WOOCOMMERCE",
  "Pinterest":"PINTEREST",
  "TikTok":"TIKTOK",
  "Facebook / Instagram":"META",
  "Bing / Microsoft Ads":"BING",
  "Walmart Marketplace":"WALMART_MARKETPLACE",
  "Walmart Connect Ads":"WALMART_ADS",
  "Amazon US Marketplace":"AMAZON_US",
  "Amazon Ads":"AMAZON_ADS",
  "Amazon Canada Marketplace":"AMAZON_CA",
  "Email":"EMAIL"
};

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function dateOnly(v:string){return v?.slice(0,10)??""}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function iso(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function parseState(c:Campaign):BuilderState{if(!c.theme?.startsWith(STATE_PREFIX))return{};try{return JSON.parse(c.theme.slice(STATE_PREFIX.length)) as BuilderState}catch{return{}}}
function templateId(name?:string){const s=(name??"").toLowerCase();if(s.includes("seasonal"))return"SEASONAL";if(s.includes("sale")||s.includes("promotional"))return"PROMOTIONAL_EVENT";if(s.includes("launch"))return"PRODUCT_LAUNCH";if(s.includes("spotlight")||s.includes("evergreen"))return"EVERGREEN_SPOTLIGHT";return undefined}
function setNative(el:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
function builderRoot(){return document.querySelector<HTMLElement>(".campaign-details-card")}
function builderDates(){return Array.from(builderRoot()?.querySelectorAll<HTMLInputElement>('input[type="date"]')??[])}
function builderName(){return Array.from(builderRoot()?.querySelectorAll<HTMLInputElement>("input")??[]).find(i=>i.type!=="date")}
function builderObjective(){return builderRoot()?.querySelector<HTMLTextAreaElement>("textarea")??null}
function messagingPanel(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector("h2")).includes("Edit and approve the campaign messaging"))}
function durationDays(a:string,b:string){if(!a||!b)return 15;const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);const n=Math.round((y.getTime()-x.getTime())/86400000)+1;return n>0&&Number.isFinite(n)?Math.min(n,60):15}

export default function CampaignWorkspaceV2(){
  const pathname=usePathname();
  const[portalTarget,setPortalTarget]=useState<HTMLElement|null>(null);
  const[campaigns,setCampaigns]=useState<Campaign[]>([]);
  const[selectedId,setSelectedId]=useState("");
  const[status,setStatus]=useState("Start a new campaign or resume one already in progress.");
  const[saving,setSaving]=useState(false),[deleting,setDeleting]=useState(false);
  const[start,setStart]=useState(""),[end,setEnd]=useState("");
  const resumable=useMemo(()=>campaigns.filter(c=>!closed.has(c.status.toUpperCase())),[campaigns]);
  const selected=campaigns.find(c=>c.id===selectedId);
  const canDelete=selected?.status.toUpperCase()==="DRAFT";

  function syncDates(){const d=builderDates();setStart(d[0]?.value??"");setEnd(d[1]?.value??"")}
  function announce(id:string,name:string){try{id?localStorage.setItem(ACTIVE_KEY,id):localStorage.removeItem(ACTIVE_KEY)}catch{}window.dispatchEvent(new CustomEvent("lmg-active-campaign-change",{detail:{id,name}}))}

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let cancelled=false,tries=0;
    const place=()=>{const topbar=document.querySelector<HTMLElement>(".campaign-topbar");if(topbar?.parentElement){let target=document.getElementById("campaign-workspace-v2");if(!target){target=document.createElement("div");target.id="campaign-workspace-v2";topbar.insertAdjacentElement("afterend",target)}if(!cancelled)setPortalTarget(target);return}if(++tries<50)setTimeout(place,100)};
    place();
    fetch("/api/campaigns",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject(new Error())).then(d=>{
      const list=(d.campaigns??[]) as Campaign[];setCampaigns(list);
      try{const active=localStorage.getItem(ACTIVE_KEY)||"";if(active&&list.some(c=>c.id===active)){setSelectedId(active);setStatus(`Resumed ${list.find(c=>c.id===active)?.name??"campaign"}.`)}}catch{}
    }).catch(()=>setStatus("Campaign list could not be loaded."));
    const sync=()=>syncDates();document.addEventListener("input",sync,true);document.addEventListener("change",sync,true);
    const restore=()=>{let payload:ResumePayload|null=null;try{const raw=localStorage.getItem(RESUME_OPPS_KEY);if(raw)payload=JSON.parse(raw) as ResumePayload}catch{}if(!payload)return;let n=0;const run=()=>{const cards=document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card");if(!cards.length){if(++n<50)setTimeout(run,100);return}cards.forEach(card=>{const asset=text(card.querySelector(".asset-select strong")),wanted=payload?.opportunities?.[asset]??[];card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(o=>{const label=text(o.querySelector("strong")).replace(/Paid$/,"" ).trim(),box=o.querySelector<HTMLInputElement>('input[type="checkbox"]');if(box){const should=wanted.includes(label);if(box.checked!==should)box.click()}})});try{localStorage.removeItem(RESUME_OPPS_KEY)}catch{};setStatus("Saved opportunity selections restored.")};run()};
    setTimeout(()=>{syncDates();restore()},250);
    return()=>{cancelled=true;document.removeEventListener("input",sync,true);document.removeEventListener("change",sync,true)};
  },[pathname]);

  function startBlank(){
    setSelectedId("");announce("","");
    const name=builderName(),dates=builderDates(),objective=builderObjective();if(name)setNative(name,"");dates.forEach(d=>setNative(d,""));if(objective)setNative(objective,"");
    setStart("");setEnd("");setStatus("Blank campaign ready.");
  }

  function resumeCampaign(id:string){
    setSelectedId(id);if(!id){startBlank();return}
    const c=campaigns.find(x=>x.id===id);if(!c){setStatus("That campaign could not be found.");return}
    const state=parseState(c);
    const activeAssets=state.activeAssets??[];
    const channels=activeAssets.map(a=>assetToChannel[a]).filter(Boolean);
    const payload={name:c.name,objective:c.objective??"",productSkus:state.productSkus?.length?state.productSkus:(c.products??[]).map(p=>p.product.sku),channels,startDate:dateOnly(c.startDate),endDate:dateOnly(c.endDate),templateId:templateId(state.templateName),headline:state.headline,coreMessage:state.coreMessage,cta:state.cta,learningSummary:`Resumed saved campaign ${c.name}`};
    try{localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify(payload));localStorage.setItem(RESUME_OPPS_KEY,JSON.stringify({campaignId:c.id,opportunities:state.opportunities??{}}));localStorage.setItem(ACTIVE_KEY,c.id)}catch{}
    announce(c.id,c.name);setStatus(`Loading ${c.name}…`);window.location.assign("/campaigns");
  }

  function updateDate(which:"start"|"end",value:string){const d=builderDates();if(which==="start"){setStart(value);if(d[0])setNative(d[0],value)}else{setEnd(value);if(d[1])setNative(d[1],value)}}

  const recommendation=useMemo(()=>{
    const days=durationDays(start,end);let s=addDays(new Date(),8);s.setHours(12,0,0,0);
    const occupied=resumable.filter(c=>c.id!==selectedId).map(c=>({start:new Date(`${dateOnly(c.startDate)}T12:00:00`),end:new Date(`${dateOnly(c.endDate)}T12:00:00`)})).filter(x=>Number.isFinite(x.start.getTime())&&Number.isFinite(x.end.getTime())).sort((a,b)=>a.start.getTime()-b.start.getTime());
    for(let i=0;i<120;i++){const e=addDays(s,days-1),hit=occupied.find(x=>s<=x.end&&x.start<=e);if(!hit)return{start:iso(s),end:iso(e),days};s=addDays(hit.end,1)}return{start:iso(s),end:iso(addDays(s,days-1)),days}
  },[start,end,resumable,selectedId]);

  function useRecommended(){updateDate("start",recommendation.start);updateDate("end",recommendation.end);setStatus("Recommended dates applied. Both dates remain editable.")}

  function snapshot(){
    const name=builderName()?.value.trim()??"",objective=builderObjective()?.value??"",dates=builderDates();
    const productSkus=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(r=>r.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(r=>text(r.querySelector("td:nth-child(2) small"))).filter(Boolean);
    const activeAssets:string[]=[],opportunities:Record<string,string[]>={};
    document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{const asset=text(card.querySelector(".asset-select strong")),on=!!card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]')?.checked;if(!asset||!on)return;activeAssets.push(asset);opportunities[asset]=Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option")).filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(o=>text(o.querySelector("strong")).replace(/Paid$/,"" ).trim())});
    const selectedTemplate=text(document.querySelector(".campaign-details-card .template-card.selected strong"));const m=messagingPanel(),mi=m?Array.from(m.querySelectorAll<HTMLInputElement>("input")):[],ma=m?Array.from(m.querySelectorAll<HTMLTextAreaElement>("textarea")):[];
    return{name,objective,startDate:dates[0]?.value??"",endDate:dates[1]?.value??"",state:{templateName:selectedTemplate,productSkus,activeAssets,opportunities,headline:mi[0]?.value??"",cta:mi[1]?.value??"",coreMessage:ma[0]?.value??""}};
  }

  async function saveDraft(){const s=snapshot();if(!s.name){setStatus("Give the campaign a name before saving.");return}setSaving(true);setStatus("Saving draft…");try{const r=await fetch("/api/campaigns/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selectedId||undefined,...s})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save draft");const c=d.campaign as Campaign;setCampaigns(cur=>[c,...cur.filter(x=>x.id!==c.id)]);setSelectedId(c.id);announce(c.id,c.name);setStatus(`${c.name} saved.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to save draft.")}finally{setSaving(false)}}

  async function deleteDraft(){if(!selected||!canDelete)return;if(!window.confirm(`Delete draft campaign “${selected.name}”?`))return;setDeleting(true);try{const r=await fetch("/api/campaigns/draft",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selected.id})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to delete draft");setCampaigns(cur=>cur.filter(c=>c.id!==selected.id));startBlank();setStatus(`${selected.name} deleted.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to delete draft.")}finally{setDeleting(false)}}

  if(pathname!=="/campaigns"||!portalTarget)return null;
  const content=<section style={{width:"100%",margin:"14px 0 22px",display:"grid",gap:12}}>
    <div style={{padding:"16px 20px",borderRadius:15,background:"#183b24",color:"white",boxShadow:"0 8px 24px rgba(25,55,35,.16)"}}><div style={{fontSize:12,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",opacity:.78}}>Campaign currently being created / edited</div><div style={{fontSize:29,fontWeight:900,marginTop:4}}>{selected?.name||builderName()?.value||"New Campaign"}</div></div>
    <div style={{padding:"16px 18px",border:"1px solid #d7dfd1",borderRadius:14,background:"white",boxShadow:"0 6px 18px rgba(30,50,30,.06)"}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(260px,1.3fr) minmax(300px,1fr) auto",gap:14,alignItems:"end"}}>
        <label style={{display:"grid",gap:6,fontWeight:800,color:"#233b27"}}>Campaign to work on<select value={selectedId} onChange={e=>resumeCampaign(e.target.value)} style={{padding:"10px 12px",border:"1px solid #aebca8",borderRadius:8,background:"white",fontSize:15,cursor:"pointer"}}><option value="">+ Start a new campaign (blank)</option>{resumable.map(c=><option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}</select></label>
        <div style={{padding:"9px 12px",borderRadius:9,background:"#f5f8f2",color:"#314c35",fontSize:14}}><strong>Campaign dates</strong><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:7}}><label>Start<input type="date" value={start} onChange={e=>updateDate("start",e.target.value)} style={{width:"100%",padding:"7px",border:"1px solid #aebca8",borderRadius:7}}/></label><label>End<input type="date" value={end} onChange={e=>updateDate("end",e.target.value)} style={{width:"100%",padding:"7px",border:"1px solid #aebca8",borderRadius:7}}/></label></div><div style={{marginTop:7,fontSize:12}}>Recommended: {recommendation.start} → {recommendation.end}</div><button type="button" onClick={useRecommended} style={{marginTop:5,padding:"6px 9px",borderRadius:7,border:"1px solid #8ca18b",background:"white",fontWeight:800}}>Use recommended dates</button></div>
        <div style={{display:"flex",gap:8}}><button type="button" onClick={saveDraft} disabled={saving||deleting} style={{padding:"11px 16px",border:0,borderRadius:9,background:"#183b24",color:"white",fontWeight:900,minWidth:112}}>{saving?"Saving…":"Save Draft"}</button>{canDelete&&<button type="button" onClick={deleteDraft} disabled={saving||deleting} style={{padding:"11px 14px",border:"1px solid #a72b2b",borderRadius:9,background:"white",color:"#a72b2b",fontWeight:900,minWidth:112}}>{deleting?"Deleting…":"Delete Draft"}</button>}</div>
      </div>
      <p style={{margin:"12px 0 0",padding:"9px 11px",borderRadius:8,background:"#f8faf6",color:"#526052",fontSize:14}}>{status}</p>
    </div>
  </section>;
  return createPortal(content,portalTarget);
}
