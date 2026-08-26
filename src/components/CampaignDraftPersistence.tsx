"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {campaignTemplates} from "@/app/campaigns/templates";

type Action={actionType?:string;description?:string;executionTarget?:string};
type Recommendation={title?:string;recommendation?:string;actions?:Action[]};
type SavedState={
  schemaVersion?:number;
  templateId?:string;
  templateName?:string;
  productSkus?:string[];
  activeAssets?:string[];
  activeChannels?:string[];
  opportunities?:Record<string,string[]>;
  opportunityLabels?:Record<string,string[]>;
  headline?:string;
  cta?:string;
  coreMessage?:string;
  messagingApproved?:boolean;
  schedule?:{date:string;label:string}[];
};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;theme?:string|null;products?:{product:{sku:string;name:string}}[];recommendations?:Recommendation[]};
type Snapshot={name:string;startDate:string;endDate:string;objective:string;state:SavedState};

const ACTIVE_KEY="lmg-active-campaign-id";
const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const STATE_PREFIX="LMG_BUILDER_STATE:";
const closed=new Set(["COMPLETED","CLOSED","CANCELLED","CANCELED","STOPPED"]);
const assetToChannel:Record<string,string>={
  "Website Homepage":"WEBSITE_HOMEPAGE","WooCommerce Store":"WOOCOMMERCE","Pinterest":"PINTEREST","TikTok":"TIKTOK","Facebook / Instagram":"META","Bing / Microsoft Ads":"BING","Walmart Marketplace":"WALMART_MARKETPLACE","Walmart Connect Ads":"WALMART_ADS","Amazon US Marketplace":"AMAZON_US","Amazon Ads":"AMAZON_ADS","Amazon Canada Marketplace":"AMAZON_CA","Email":"EMAIL"
};
const channelToAsset=Object.fromEntries(Object.entries(assetToChannel).map(([a,c])=>[c,a])) as Record<string,string>;

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function dateOnly(value:string){return value?value.slice(0,10):""}
function parseState(c:Campaign):SavedState{if(!c.theme?.startsWith(STATE_PREFIX))return{};try{return JSON.parse(c.theme.slice(STATE_PREFIX.length)) as SavedState}catch{return{}}}
function hasExactSnapshot(c:Campaign){const s=parseState(c);return (s.schemaVersion??0)>=4&&!!s.templateId&&Array.isArray(s.productSkus)&&Array.isArray(s.activeChannels)&&!!s.opportunityLabels}
function setNativeValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;setter?.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
function templateIdFromName(name:string){return campaignTemplates.find(t=>t.name===name)?.id??campaignTemplates.find(t=>name.toLowerCase().includes(t.name.toLowerCase()))?.id}
function getStep1(){return document.querySelector<HTMLElement>(".campaign-details-card")}
function getMessaging(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector("h2")).includes("Edit and approve the campaign messaging"))}
function getSchedule(){return Array.from(document.querySelectorAll<HTMLElement>(".opportunity-calendar p")).map(row=>({date:text(row.querySelector("strong")),label:text(row.querySelector("span"))})).filter(x=>x.date&&x.label)}
function builderReady(){return !!getStep1()&&document.querySelectorAll(".campaign-table tbody tr").length>0&&document.querySelectorAll("#channels .opportunity-channel-card").length>0}
function waitForBuilder(work:()=>void){let tries=0;const run=()=>{if(builderReady()){work();return}if(++tries<80)window.setTimeout(run,100)};run()}

function snapshot():Snapshot{
 const step1=getStep1(),inputs=step1?Array.from(step1.querySelectorAll<HTMLInputElement>("input")):[],name=inputs.find(i=>i.type!=="date")?.value.trim()??"",dates=inputs.filter(i=>i.type==="date"),objective=step1?.querySelector<HTMLTextAreaElement>("textarea")?.value??"";
 const templateButton=step1?.querySelector<HTMLElement>(".template-card.selected"),templateName=text(templateButton?.querySelector("strong")),templateId=templateIdFromName(templateName);
 const productSkus=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(r=>r.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(r=>text(r.querySelector("td:nth-child(2) small"))).filter(Boolean);
 const activeAssets:string[]=[],activeChannels:string[]=[],opportunityLabels:Record<string,string[]>={};
 document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{const asset=text(card.querySelector(".asset-select strong")),active=!!card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]')?.checked;if(!asset||!active)return;activeAssets.push(asset);const channel=assetToChannel[asset];if(channel)activeChannels.push(channel);opportunityLabels[channel||asset]=Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option")).filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(o=>text(o.querySelector("strong")).replace(/Paid$/,"" ).trim()).filter(Boolean)});
 const messaging=getMessaging(),mInputs=messaging?Array.from(messaging.querySelectorAll<HTMLInputElement>("input")):[],areas=messaging?Array.from(messaging.querySelectorAll<HTMLTextAreaElement>("textarea")):[],approval=text(messaging?.querySelector(".approval-status"));
 return{name,startDate:dates[0]?.value??"",endDate:dates[1]?.value??"",objective,state:{schemaVersion:4,templateId,templateName,productSkus,activeAssets,activeChannels,opportunityLabels,headline:mInputs[0]?.value??"",cta:mInputs[1]?.value??"",coreMessage:areas[0]?.value??"",messagingApproved:/approved/i.test(approval),schedule:getSchedule()}}
}

function legacyRecovery(c:Campaign):SavedState{
 const activeChannels:string[]=[],activeAssets:string[]=[],opportunityLabels:Record<string,string[]>={};let headline="",coreMessage="",cta="";
 for(const rec of c.recommendations??[]){const title=rec.title??"";let channel="";if(/^WooCommerce\s*·/i.test(title)){channel="WOOCOMMERCE";const label=title.replace(/^WooCommerce\s*·\s*/i,"").trim();if(label)(opportunityLabels[channel]??=[]).push(label)}else if(/Pinterest/i.test(title))channel="PINTEREST";else if(/TikTok/i.test(title))channel="TIKTOK";else if(/Email/i.test(title))channel="EMAIL";else if(/Website|Homepage/i.test(title))channel="WEBSITE_HOMEPAGE";else if(/Facebook|Instagram|Meta/i.test(title))channel="META";else if(/Bing|Microsoft/i.test(title))channel="BING";else if(/Walmart Connect|Walmart Ads/i.test(title))channel="WALMART_ADS";else if(/Walmart/i.test(title))channel="WALMART_MARKETPLACE";else if(/Amazon Canada/i.test(title))channel="AMAZON_CA";else if(/Amazon Ads/i.test(title))channel="AMAZON_ADS";else if(/Amazon/i.test(title))channel="AMAZON_US";if(channel&&!activeChannels.includes(channel)){activeChannels.push(channel);activeAssets.push(channelToAsset[channel]??channel)}for(const a of rec.actions??[]){if(a.actionType!=="CREATIVE_DRAFT"||!a.description?.trim().startsWith("{"))continue;try{const d=JSON.parse(a.description) as {headline?:string;body?:string;cta?:string};headline||=d.headline??"";coreMessage||=d.body??"";cta||=d.cta??""}catch{}}}
 return{schemaVersion:1,productSkus:(c.products??[]).map(p=>p.product.sku),activeChannels,activeAssets,opportunityLabels,headline,coreMessage,cta,messagingApproved:false};
}

function applyExactResume(state:SavedState){
 const desired=state.opportunityLabels??{};
 document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{const asset=text(card.querySelector(".asset-select strong")),channel=assetToChannel[asset]??asset,wanted=desired[channel]??desired[asset]??[];if(!(state.activeChannels??[]).includes(channel)&&!(state.activeAssets??[]).includes(asset))return;card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(option=>{const label=text(option.querySelector("strong")).replace(/Paid$/,"" ).trim(),box=option.querySelector<HTMLInputElement>('input[type="checkbox"]'),should=wanted.some(saved=>saved===label);if(box&&box.checked!==should)box.click()})});
 if(state.messagingApproved){const messaging=getMessaging(),status=text(messaging?.querySelector(".approval-status"));if(messaging&&!/approved/i.test(status)){const button=Array.from(messaging.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve Messaging/i.test(text(b)));button?.click()}}
}

export default function CampaignDraftPersistence(){
 const pathname=usePathname();
 const[target,setTarget]=useState<HTMLElement|null>(null),[campaigns,setCampaigns]=useState<Campaign[]>([]),[selectedId,setSelectedId]=useState(""),[status,setStatus]=useState("Start a new campaign or deliberately select a saved campaign to resume."),[saving,setSaving]=useState(false),[deleting,setDeleting]=useState(false);
 const resumable=useMemo(()=>campaigns.filter(c=>!closed.has(c.status.toUpperCase())),[campaigns]);
 const selected=campaigns.find(c=>c.id===selectedId),canDelete=selected?.status.toUpperCase()==="DRAFT";

 async function refresh(){try{const r=await fetch("/api/campaigns",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();setCampaigns((d.campaigns??[]) as Campaign[])}catch{setStatus("Campaign list could not be loaded.")}}

 useEffect(()=>{if(pathname!=="/campaigns")return;try{localStorage.removeItem(ACTIVE_KEY)}catch{};let cancelled=false,tries=0;const place=()=>{const top=document.querySelector<HTMLElement>(".campaign-topbar");if(top?.parentElement){let t=document.getElementById("campaign-snapshot-workspace");if(!t){t=document.createElement("div");t.id="campaign-snapshot-workspace";top.insertAdjacentElement("afterend",t)}if(!cancelled)setTarget(t);return}if(++tries<60)window.setTimeout(place,100)};place();void refresh();let resume:SavedState|null=null;try{const raw=localStorage.getItem(RESUME_KEY);if(raw){resume=JSON.parse(raw) as SavedState;localStorage.removeItem(RESUME_KEY)}}catch{}if(resume)waitForBuilder(()=>applyExactResume(resume!));return()=>{cancelled=true}},[pathname]);

 useEffect(()=>{if(pathname!=="/campaigns")return;const handler=(event:MouseEvent)=>{const button=(event.target as HTMLElement)?.closest("button");if(!button||!/Approve Campaign Plan & Create Opportunity Assets/i.test(text(button)))return;const snap=snapshot();if(!snap.name)return;window.setTimeout(async()=>{try{const r=await fetch("/api/campaigns",{cache:"no-store"}),d=await r.json();const list=(d.campaigns??[]) as Campaign[],match=list.find(c=>c.name===snap.name&&dateOnly(c.startDate)===snap.startDate);if(!match)return;await fetch("/api/campaigns/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:match.id,name:snap.name,objective:snap.objective,startDate:snap.startDate,endDate:snap.endDate,state:snap.state})});await refresh()}catch{}},1200)};document.addEventListener("click",handler,true);return()=>document.removeEventListener("click",handler,true)},[pathname]);

 function newCampaign(){setSelectedId("");try{localStorage.removeItem(ACTIVE_KEY);localStorage.removeItem(RESUME_KEY);localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({name:" ",objective:" ",productSkus:["__NONE__"],channels:["__NONE__"],startDate:"",endDate:"",templateId:"EVERGREEN_SPOTLIGHT",headline:" ",coreMessage:" ",cta:" ",learningSummary:"Blank campaign"}));window.location.href="/campaigns"}catch{window.location.href="/campaigns"}}

 function choose(id:string){setSelectedId(id);if(!id){newCampaign();return}const c=campaigns.find(x=>x.id===id);if(!c){setStatus("That campaign could not be found.");return}const exact=hasExactSnapshot(c),state=exact?parseState(c):legacyRecovery(c),channels=state.activeChannels??[];try{localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({name:c.name,objective:c.objective??"",productSkus:state.productSkus?.length?state.productSkus:(c.products??[]).map(p=>p.product.sku),channels:channels.length?channels:["__NONE__"],startDate:dateOnly(c.startDate),endDate:dateOnly(c.endDate),templateId:state.templateId,headline:state.headline,coreMessage:state.coreMessage,cta:state.cta,learningSummary:exact?`Exact saved snapshot: ${c.name}`:`Legacy campaign recovered from the data that was actually persisted: ${c.name}`}));localStorage.setItem(RESUME_KEY,JSON.stringify(state));localStorage.setItem(ACTIVE_KEY,c.id);window.location.href="/campaigns"}catch{setStatus("Campaign could not be loaded. Please refresh and try again.")}}

 async function saveCurrent(){const snap=snapshot();if(!snap.name){setStatus("Give the campaign a name before saving it.");return}if(!snap.startDate||!snap.endDate){setStatus("Set both campaign dates before saving.");return}setSaving(true);setStatus("Saving the complete campaign snapshot…");try{const r=await fetch("/api/campaigns/draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selectedId||undefined,name:snap.name,objective:snap.objective,startDate:snap.startDate,endDate:snap.endDate,state:snap.state})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to save campaign");const saved=d.campaign as Campaign;setCampaigns(cur=>[saved,...cur.filter(c=>c.id!==saved.id)]);setSelectedId(saved.id);setStatus(`${saved.name} saved with an exact Campaign Builder snapshot. Reopening it will restore these saved values, not current defaults.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to save campaign.")}finally{setSaving(false)}}

 async function deleteDraft(){if(!selected||!canDelete)return;if(!confirm(`Delete draft campaign “${selected.name}”?`))return;setDeleting(true);try{const r=await fetch("/api/campaigns/draft",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:selected.id})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to delete draft");setCampaigns(cur=>cur.filter(c=>c.id!==selected.id));setSelectedId("");setStatus(`${selected.name} deleted.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to delete draft.")}finally{setDeleting(false)}}

 if(pathname!=="/campaigns"||!target)return null;
 return createPortal(<section style={{width:"100%",margin:"14px 0 22px",display:"grid",gap:12}}><div style={{padding:"16px 20px",borderRadius:15,background:"#183b24",color:"white"}}><div style={{fontSize:12,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",opacity:.78}}>Campaign workspace</div><div style={{fontSize:29,fontWeight:900,marginTop:4}}>{selected?.name||"New Campaign"}</div></div><div style={{padding:"16px 18px",border:"1px solid #d7dfd1",borderRadius:14,background:"white"}}><div style={{display:"grid",gridTemplateColumns:"minmax(320px,1fr) auto",gap:14,alignItems:"end"}}><label style={{display:"grid",gap:6,fontWeight:800}}>Campaign to work on<select value={selectedId} onChange={e=>choose(e.target.value)} style={{padding:"10px 12px",border:"1px solid #aebca8",borderRadius:8,background:"white",fontSize:15}}><option value="">+ Start a new campaign (blank)</option>{resumable.map(c=><option key={c.id} value={c.id}>{c.name} · {c.status}{hasExactSnapshot(c)?" · saved snapshot":" · legacy"}</option>)}</select></label><div style={{display:"flex",gap:8}}><button type="button" onClick={saveCurrent} disabled={saving||deleting}>{saving?"Saving…":"Save Current Campaign"}</button>{canDelete&&<button type="button" onClick={deleteDraft} disabled={saving||deleting}>{deleting?"Deleting…":"Delete Draft"}</button>}</div></div><p style={{margin:"12px 0 0",padding:"9px 11px",background:"#f8faf6",fontSize:14}}>{status}</p>{selected&&!hasExactSnapshot(selected)&&<p style={{margin:"8px 0 0",padding:"9px 11px",background:"#fff7df",fontSize:13}}><strong>Legacy campaign:</strong> this record predates complete builder snapshots. LMG Marketing will restore only values that were actually persisted. Save it once after correcting any missing legacy fields and all future resumes will be exact.</p>}</div></section>,target)
}
