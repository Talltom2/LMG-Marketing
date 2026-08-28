"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {campaignTemplates} from "@/app/campaigns/templates";

type Action={actionType?:string;description?:string;executionTarget?:string};
type Recommendation={title?:string;recommendation?:string;actions?:Action[]};
type ProductCollection={id:string;name:string;skus:string[]};
type SavedState={
  schemaVersion?:number;
  templateId?:string;
  templateName?:string;
  productSkus?:string[];
  activeAssets?:string[];
  activeChannels?:string[];
  opportunityLabels?:Record<string,string[]>;
  headline?:string;
  cta?:string;
  coreMessage?:string;
  messagingApproved?:boolean;
  schedule?:{date:string;label:string}[];
  approvedVisuals?:string[];
  generatedVisuals?:Record<string,string>;
  cardCollapse?:Record<string,boolean>;
  channelCollapse?:Record<string,boolean>;
  collections?:ProductCollection[];
};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;theme?:string|null;products?:{product:{sku:string;name:string}}[];recommendations?:Recommendation[]};
type Snapshot={name:string;startDate:string;endDate:string;objective:string;state:SavedState};

const ACTIVE_KEY="lmg-active-campaign-id";
const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const STATE_PREFIX="LMG_BUILDER_STATE:";
const COLLECTION_STORAGE_KEY="lmg-marketing-product-collections-v1";
const CHANNEL_COLLAPSE_KEY="lmg-campaign-channel-opportunity-collapse-v2";
const CARD_COLLAPSE_PREFIX="lmg-safe-builder-collapse-v1:";
const APPROVED_VISUALS_KEY="lmg-campaign-approved-visuals-v1";
const GENERATED_VISUALS_PREFIX="lmg-campaign-generated-visuals-v2:";
const closed=new Set(["COMPLETED","CLOSED","CANCELLED","CANCELED","STOPPED"]);
const assetToChannel:Record<string,string>={
  "Website Homepage":"WEBSITE_HOMEPAGE","WooCommerce Store":"WOOCOMMERCE","Pinterest":"PINTEREST","TikTok":"TIKTOK","Facebook / Instagram":"META","Bing / Microsoft Ads":"BING","Walmart Marketplace":"WALMART_MARKETPLACE","Walmart Connect Ads":"WALMART_ADS","Amazon US Marketplace":"AMAZON_US","Amazon Ads":"AMAZON_ADS","Amazon Canada Marketplace":"AMAZON_CA","Email":"EMAIL"
};
const channelToAsset=Object.fromEntries(Object.entries(assetToChannel).map(([asset,channel])=>[channel,asset])) as Record<string,string>;

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function dateOnly(value:string){return value?value.slice(0,10):""}
function parseState(c:Campaign):SavedState{if(!c.theme?.startsWith(STATE_PREFIX))return{};try{return JSON.parse(c.theme.slice(STATE_PREFIX.length)) as SavedState}catch{return{}}}
function hasExactSnapshot(c:Campaign){const s=parseState(c);return (s.schemaVersion??0)>=4&&Array.isArray(s.productSkus)&&Array.isArray(s.activeChannels)&&!!s.opportunityLabels}
function templateIdFromName(name:string){return campaignTemplates.find(t=>t.name===name)?.id??campaignTemplates.find(t=>name.toLowerCase().includes(t.name.toLowerCase()))?.id}
function getStep1(){return document.querySelector<HTMLElement>(".campaign-details-card")}
function stage(step:string){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))===step)??null}
function getMessaging(){return stage("5")}
function getVisualSection(){return stage("5A")}
function getSchedule(){return Array.from(document.querySelectorAll<HTMLElement>(".opportunity-calendar p")).map(row=>({date:text(row.querySelector("strong")),label:text(row.querySelector("span"))})).filter(x=>x.date&&x.label)}
function builderReady(){return !!getStep1()&&document.querySelectorAll(".campaign-table tbody tr").length>0&&document.querySelectorAll("#channels .opportunity-channel-card").length>0}
function waitForBuilder(work:()=>void){let tries=0;const run=()=>{if(builderReady()){work();return}if(++tries<100)window.setTimeout(run,100)};run()}
function readJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??"") as T}catch{return fallback}}
function cleanVisualLabel(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}

function snapshot():Snapshot{
  const step1=getStep1();
  const inputs=step1?Array.from(step1.querySelectorAll<HTMLInputElement>("input")):[];
  const name=inputs.find(i=>i.type!=="date")?.value.trim()??"";
  const dates=inputs.filter(i=>i.type==="date");
  const objective=step1?.querySelector<HTMLTextAreaElement>("textarea")?.value??"";
  const templateButton=step1?.querySelector<HTMLElement>(".template-card.selected");
  const templateName=text(templateButton?.querySelector("strong"));
  const templateId=templateIdFromName(templateName);
  const productSkus=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr"))
    .filter(r=>r.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
    .map(r=>text(r.querySelector("td:nth-child(2) small"))).filter(Boolean);

  const activeAssets:string[]=[],activeChannels:string[]=[],opportunityLabels:Record<string,string[]>={};
  document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
    const asset=text(card.querySelector(".asset-select strong"));
    const active=!!card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]')?.checked;
    if(!asset||!active)return;
    activeAssets.push(asset);
    const channel=assetToChannel[asset];if(channel)activeChannels.push(channel);
    opportunityLabels[channel||asset]=Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option"))
      .filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
      .map(o=>text(o.querySelector("strong")).replace(/Paid$/,"" ).trim()).filter(Boolean);
  });

  const messaging=getMessaging();
  const mInputs=messaging?Array.from(messaging.querySelectorAll<HTMLInputElement>(".creative-editor input")):[];
  const areas=messaging?Array.from(messaging.querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea")):[];
  const approval=text(messaging?.querySelector(".approval-status"));

  const approvedVisuals:string[]=[];
  const generatedVisuals:Record<string,string>={};
  const visual=getVisualSection();
  for(const card of Array.from(visual?.querySelectorAll<HTMLElement>("article.creative-card")??[])){
    const label=cleanVisualLabel(text(card.querySelector("h3")));if(!label)continue;
    const status=text(card.querySelector(".creative-version")).toUpperCase();
    if(status.includes("APPROVED"))approvedVisuals.push(label);
    const generated=card.querySelector<HTMLImageElement>("img[data-lmg-generated='1']");
    if(generated?.src)generatedVisuals[label]=generated.src;
  }

  const cardCollapse:Record<string,boolean>={};
  for(const step of ["3","4","5","5A"])try{cardCollapse[step]=localStorage.getItem(`${CARD_COLLAPSE_PREFIX}${step}`)==="1"}catch{}
  const channelCollapse=readJson<Record<string,boolean>>(CHANNEL_COLLAPSE_KEY,{});
  const collections=readJson<ProductCollection[]>(COLLECTION_STORAGE_KEY,[]);

  return{
    name,startDate:dates[0]?.value??"",endDate:dates[1]?.value??"",objective,
    state:{schemaVersion:5,templateId,templateName,productSkus,activeAssets,activeChannels,opportunityLabels,headline:mInputs[0]?.value??"",cta:mInputs[1]?.value??"",coreMessage:areas[0]?.value??"",messagingApproved:/approved/i.test(approval)||!!messaging, schedule:getSchedule(),approvedVisuals:Array.from(new Set(approvedVisuals)),generatedVisuals,cardCollapse,channelCollapse,collections}
  };
}

function legacyRecovery(c:Campaign):SavedState{
  const activeChannels:string[]=[],activeAssets:string[]=[],opportunityLabels:Record<string,string[]>={};let headline="",coreMessage="",cta="";
  for(const rec of c.recommendations??[]){
    const title=rec.title??"";let channel="";
    if(/^WooCommerce\s*·/i.test(title)){channel="WOOCOMMERCE";const label=title.replace(/^WooCommerce\s*·\s*/i,"").trim();if(label)(opportunityLabels[channel]??=[]).push(label)}
    else if(/Pinterest/i.test(title))channel="PINTEREST";else if(/TikTok/i.test(title))channel="TIKTOK";else if(/Email/i.test(title))channel="EMAIL";else if(/Website|Homepage/i.test(title))channel="WEBSITE_HOMEPAGE";else if(/Facebook|Instagram|Meta/i.test(title))channel="META";else if(/Bing|Microsoft/i.test(title))channel="BING";else if(/Walmart Connect|Walmart Ads/i.test(title))channel="WALMART_ADS";else if(/Walmart/i.test(title))channel="WALMART_MARKETPLACE";else if(/Amazon Canada/i.test(title))channel="AMAZON_CA";else if(/Amazon Ads/i.test(title))channel="AMAZON_ADS";else if(/Amazon/i.test(title))channel="AMAZON_US";
    if(channel&&!activeChannels.includes(channel)){activeChannels.push(channel);activeAssets.push(channelToAsset[channel]??channel)}
    for(const a of rec.actions??[]){if(a.actionType!=="CREATIVE_DRAFT"||!a.description?.trim().startsWith("{"))continue;try{const d=JSON.parse(a.description) as {headline?:string;body?:string;cta?:string};headline||=d.headline??"";coreMessage||=d.body??"";cta||=d.cta??""}catch{}}
  }
  return{schemaVersion:1,productSkus:(c.products??[]).map(p=>p.product.sku),activeChannels,activeAssets,opportunityLabels,headline,coreMessage,cta,messagingApproved:false};
}

function cacheState(campaignId:string,campaignName:string,state:SavedState){
  try{
    if(state.generatedVisuals)localStorage.setItem(`${GENERATED_VISUALS_PREFIX}${campaignId}`,JSON.stringify(state.generatedVisuals));
    if(state.approvedVisuals){const map=readJson<Record<string,string[]>>(APPROVED_VISUALS_KEY,{});map[campaignName.toLowerCase()]=state.approvedVisuals;localStorage.setItem(APPROVED_VISUALS_KEY,JSON.stringify(map));}
    if(state.cardCollapse)for(const[step,value]of Object.entries(state.cardCollapse))localStorage.setItem(`${CARD_COLLAPSE_PREFIX}${step}`,value?"1":"0");
    if(state.channelCollapse)localStorage.setItem(CHANNEL_COLLAPSE_KEY,JSON.stringify(state.channelCollapse));
    if(state.collections)localStorage.setItem(COLLECTION_STORAGE_KEY,JSON.stringify(state.collections));
  }catch{}
}

function applyExactResume(state:SavedState){
  const desired=state.opportunityLabels??{};
  document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
    const asset=text(card.querySelector(".asset-select strong")),channel=assetToChannel[asset]??asset;
    if(!(state.activeChannels??[]).includes(channel)&&!(state.activeAssets??[]).includes(asset))return;
    const wanted=desired[channel]??desired[asset]??[];
    card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(option=>{
      const label=text(option.querySelector("strong")).replace(/Paid$/,"" ).trim();
      const box=option.querySelector<HTMLInputElement>('input[type="checkbox"]');
      const should=wanted.includes(label);if(box&&box.checked!==should)box.click();
    });
  });
}

function handoff(campaignId:string,snap:Snapshot,summary:string){
  try{
    localStorage.setItem(ACTIVE_KEY,campaignId);
    localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({name:snap.name,objective:snap.objective,productSkus:snap.state.productSkus??[],channels:snap.state.activeChannels??[],startDate:snap.startDate,endDate:snap.endDate,templateId:snap.state.templateId??"",headline:snap.state.headline??"",coreMessage:snap.state.coreMessage??"",cta:snap.state.cta??"",learningSummary:summary}));
    localStorage.setItem(RESUME_KEY,JSON.stringify(snap.state));
    cacheState(campaignId,snap.name,snap.state);
  }catch{}
}

function campaignHandoff(c:Campaign,state:SavedState,summary:string){
  try{
    localStorage.setItem(ACTIVE_KEY,c.id);
    localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({name:c.name,objective:c.objective??"",productSkus:Array.isArray(state.productSkus)?state.productSkus:(c.products??[]).map(p=>p.product.sku),channels:state.activeChannels??[],startDate:dateOnly(c.startDate),endDate:dateOnly(c.endDate),templateId:state.templateId??"",headline:state.headline??"",coreMessage:state.coreMessage??"",cta:state.cta??"",learningSummary:summary}));
    cacheState(c.id,c.name,state);
  }catch{}
}

export default function CampaignDraftPersistence(){
  const pathname=usePathname();
  const[target,setTarget]=useState<HTMLElement|null>(null),[campaigns,setCampaigns]=useState<Campaign[]>([]),[selectedId,setSelectedId]=useState(""),[status,setStatus]=useState("Start a new campaign or select a saved campaign to resume."),[saving,setSaving]=useState(false),[deleting,setDeleting]=useState(false),[autoState,setAutoState]=useState<"idle"|"pending"|"saving"|"saved"|"error">("idle");
  const autoTimer=useRef<number|undefined>(undefined),autoBusy=useRef(false),lastSavedSignature=useRef("");
  const resumable=useMemo(()=>campaigns.filter(c=>!closed.has(c.status.toUpperCase())),[campaigns]);
  const selected=campaigns.find(c=>c.id===selectedId),canDelete=selected?.status.toUpperCase()==="DRAFT";

  async function refresh(){
    try{
      const r=await fetch("/api/campaigns",{cache:"no-store"});if(!r.ok)throw new Error();
      const d=await r.json(),list=(d.campaigns??[]) as Campaign[];setCampaigns(list);
      try{
        const activeId=localStorage.getItem(ACTIVE_KEY)||"",active=list.find(c=>c.id===activeId&&!closed.has(c.status.toUpperCase()));
        if(active){setSelectedId(active.id);const state=hasExactSnapshot(active)?parseState(active):legacyRecovery(active);cacheState(active.id,active.name,state);if(hasExactSnapshot(active))waitForBuilder(()=>applyExactResume(state));}
        else if(activeId)localStorage.removeItem(ACTIVE_KEY);
      }catch{}
    }catch{setStatus("Campaign list could not be loaded.")}
  }

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let cancelled=false,tries=0;
    const place=()=>{const top=document.querySelector<HTMLElement>(".campaign-topbar");if(top?.parentElement){let t=document.getElementById("campaign-snapshot-workspace");if(!t){t=document.createElement("div");t.id="campaign-snapshot-workspace";top.insertAdjacentElement("afterend",t)}if(!cancelled)setTarget(t);return}if(++tries<60)window.setTimeout(place,100)};
    place();void refresh();
    let resume:SavedState|null=null;try{const raw=localStorage.getItem(RESUME_KEY);if(raw){resume=JSON.parse(raw) as SavedState;localStorage.removeItem(RESUME_KEY)}}catch{}
    if(resume)waitForBuilder(()=>applyExactResume(resume!));
    return()=>{cancelled=true};
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const handler=(event:MouseEvent)=>{
      const button=(event.target as HTMLElement)?.closest("button");if(!button||!/Approve Campaign Plan & Create Opportunity Assets/i.test(text(button)))return;
      const snap=snapshot();if(!snap.name)return;
      window.setTimeout(async()=>{try{const r=await fetch("/api/campaigns",{cache:"no-store"}),d=await r.json();const list=(d.campaigns??[]) as Campaign[],match=list.find(c=>c.name===snap.name&&dateOnly(c.startDate)===snap.startDate);if(!match)return;await fetch(`/api/campaigns/${encodeURIComponent(match.id)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(snap)});handoff(match.id,snap,`Current campaign: ${snap.name}`);await refresh()}catch{}},1200);
    };
    document.addEventListener("click",handler,true);return()=>document.removeEventListener("click",handler,true);
  },[pathname]);

  async function writeSnapshot(snap:Snapshot,campaignId:string,automatic:boolean){
    if(!snap.name||!snap.startDate||!snap.endDate)return null;
    const signature=JSON.stringify(snap);if(automatic&&signature===lastSavedSignature.current){setAutoState("saved");return null}
    const endpoint=campaignId?`/api/campaigns/${encodeURIComponent(campaignId)}/builder-state`:"/api/campaigns/draft";
    const method=campaignId?"PATCH":"POST";
    const body=campaignId?snap:{name:snap.name,objective:snap.objective,startDate:snap.startDate,endDate:snap.endDate,state:snap.state};
    const r=await fetch(endpoint,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();
    if(!r.ok)throw new Error(d.error||"Unable to save campaign");
    const saved=d.campaign as Campaign;lastSavedSignature.current=signature;setCampaigns(cur=>[saved,...cur.filter(c=>c.id!==saved.id)]);setSelectedId(saved.id);handoff(saved.id,snap,`Current campaign: ${snap.name}`);return saved;
  }

  useEffect(()=>{
    if(pathname!=="/campaigns"||!selectedId)return;
    const schedule=(event:Event)=>{
      const custom=event.type==="lmg-builder-state-changed";
      if(!custom&&!event.isTrusted)return;
      const el=event.target as HTMLElement|null;
      if(!custom&&(!el||el.closest("#campaign-snapshot-workspace")||!el.closest(".campaign-shell")))return;
      if(autoTimer.current)window.clearTimeout(autoTimer.current);setAutoState("pending");
      autoTimer.current=window.setTimeout(async()=>{if(autoBusy.current)return;const snap=snapshot();if(!snap.name||!snap.startDate||!snap.endDate)return;autoBusy.current=true;setAutoState("saving");try{await writeSnapshot(snap,selectedId,true);setAutoState("saved");setStatus(`${snap.name} is persistently saved as you work.`)}catch(e){setAutoState("error");setStatus(e instanceof Error?`Autosave failed: ${e.message}`:"Autosave failed.")}finally{autoBusy.current=false}},750);
    };
    document.addEventListener("input",schedule,true);document.addEventListener("change",schedule,true);document.addEventListener("click",schedule,true);document.addEventListener("lmg-builder-state-changed",schedule as EventListener,true);
    return()=>{document.removeEventListener("input",schedule,true);document.removeEventListener("change",schedule,true);document.removeEventListener("click",schedule,true);document.removeEventListener("lmg-builder-state-changed",schedule as EventListener,true);if(autoTimer.current)window.clearTimeout(autoTimer.current)};
  },[pathname,selectedId]);

  function newCampaign(){
    setSelectedId("");setAutoState("idle");
    try{localStorage.removeItem(ACTIVE_KEY);localStorage.removeItem(RESUME_KEY);localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({name:"",objective:"",productSkus:[],channels:[],startDate:"",endDate:"",templateId:"",headline:"",coreMessage:"",cta:"",learningSummary:"Blank campaign"}));window.location.href="/campaigns"}catch{window.location.href="/campaigns"}
  }

  function choose(id:string){
    setSelectedId(id);setAutoState("idle");if(!id){newCampaign();return}
    const c=campaigns.find(x=>x.id===id);if(!c){setStatus("That campaign could not be found.");return}
    const exact=hasExactSnapshot(c),state=exact?parseState(c):legacyRecovery(c);
    try{campaignHandoff(c,state,exact?`Exact saved snapshot: ${c.name}`:`Legacy campaign recovered from persisted campaign data: ${c.name}`);localStorage.setItem(RESUME_KEY,JSON.stringify(state));window.location.href="/campaigns"}catch{setStatus("Campaign could not be loaded. Please refresh and try again.")}
  }

  async function saveCurrent(){
    const snap=snapshot();if(!snap.name){setStatus("Give the campaign a name before saving it.");return}if(!snap.startDate||!snap.endDate){setStatus("Set both campaign dates before saving.");return}
    setSaving(true);setStatus("Saving the complete campaign snapshot…");try{const saved=await writeSnapshot(snap,selectedId,false);if(saved){setAutoState("saved");setStatus(`${saved.name} saved. Every subsequent builder edit is now persisted automatically.`)}}catch(e){setStatus(e instanceof Error?e.message:"Unable to save campaign.")}finally{setSaving(false)}
  }

  async function deleteDraft(){
    if(!selected||!canDelete)return;if(!confirm(`Delete draft campaign “${selected.name}”?`))return;setDeleting(true);
    try{const r=await fetch("/api/campaigns/draft",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selected.id})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to delete draft");try{localStorage.removeItem(ACTIVE_KEY);localStorage.removeItem(RESUME_KEY);localStorage.removeItem(LEARNING_DRAFT_KEY)}catch{}setCampaigns(cur=>cur.filter(c=>c.id!==selected.id));setSelectedId("");setAutoState("idle");setStatus(`${selected.name} deleted.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to delete draft.")}finally{setDeleting(false)}
  }

  if(pathname!=="/campaigns"||!target)return null;
  const autoLabel=!selectedId?"Autosave begins after the campaign's first save":autoState==="saving"?"Saving persistently…":autoState==="pending"?"Changes detected…":autoState==="error"?"Autosave needs attention":"✓ Persistent autosave on";
  return createPortal(<section style={{width:"100%",margin:"14px 0 22px",display:"grid",gap:12}}><div style={{padding:"16px 20px",borderRadius:15,background:"#183b24",color:"white"}}><div style={{fontSize:12,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",opacity:.78}}>Campaign workspace</div><div style={{fontSize:29,fontWeight:900,marginTop:4}}>{selected?.name||"New Campaign"}</div></div><div style={{padding:"16px 18px",border:"1px solid #d7dfd1",borderRadius:14,background:"white"}}><div style={{display:"grid",gridTemplateColumns:"minmax(320px,1fr) auto",gap:14,alignItems:"end"}}><label style={{display:"grid",gap:6,fontWeight:800}}>Campaign to work on<select value={selectedId} onChange={e=>choose(e.target.value)} style={{height:42,padding:"0 12px",border:"1px solid #aebca8",borderRadius:8,background:"white",fontSize:15}}><option value="">+ Start a new campaign (blank)</option>{resumable.map(c=><option key={c.id} value={c.id}>{c.name} · {c.status}{hasExactSnapshot(c)?" · saved snapshot":" · legacy"}</option>)}</select></label><div style={{display:"flex",gap:8}}><button type="button" onClick={saveCurrent} disabled={saving||deleting} style={{height:42,padding:"0 16px"}}>{saving?"Saving…":"Save Current Campaign"}</button>{canDelete&&<button type="button" onClick={deleteDraft} disabled={saving||deleting} style={{height:42,padding:"0 16px"}}>{deleting?"Deleting…":"Delete Draft"}</button>}</div></div><div style={{margin:"10px 0 0",fontSize:13,fontWeight:800}}>{autoLabel}</div><p style={{margin:"8px 0 0",padding:"9px 11px",background:"#f8faf6",fontSize:14}}>{status}</p>{selected&&!hasExactSnapshot(selected)&&<p style={{margin:"8px 0 0",padding:"9px 11px",background:"#fff7df",fontSize:13}}><strong>Legacy campaign:</strong> this record predates complete builder snapshots. Correct any missing legacy fields; your next edit will persist the corrected builder snapshot without rebuilding campaign history.</p>}</div></section>,target);
}
