"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-generated-visuals-v1";
const SCHEDULED_KEY="lmg-campaign-scheduled-opportunities-v1";
const INSTANCE_KEY="lmg-campaign-instance-v1";
type VisualMap=Record<string,string>;
type ScheduleStatus="QUEUED"|"SCHEDULED";
type ScheduleItem={queuedAt:string;channel:string;opportunity:string;status?:ScheduleStatus;startDate?:string;endDate?:string;destinationUrl?:string;slot?:string};
type ScheduleMap=Record<string,ScheduleItem>;

function readStored():VisualMap{try{return JSON.parse(sessionStorage.getItem(STORAGE_KEY)??"{}") as VisualMap;}catch{return{};}}
function writeStored(value:VisualMap){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}}
function readScheduled():ScheduleMap{try{return JSON.parse(localStorage.getItem(SCHEDULED_KEY)??"{}") as ScheduleMap;}catch{return{};}}
function writeScheduled(value:ScheduleMap){try{localStorage.setItem(SCHEDULED_KEY,JSON.stringify(value));}catch{}}
function newInstanceId(){return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function campaignInstance(){try{let id=sessionStorage.getItem(INSTANCE_KEY);if(!id){id=newInstanceId();sessionStorage.setItem(INSTANCE_KEY,id);}return id;}catch{return"session";}}
function renewCampaignInstance(){try{const id=newInstanceId();sessionStorage.setItem(INSTANCE_KEY,id);return id;}catch{return"session";}}
function labelFromOption(text:string){return text.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim();}
function setText(el:HTMLElement|null,value:string){if(el&&el.textContent!==value)el.textContent=value;}
function homepageSlot(channel:string,opportunity:string){if(channel!=="Website Homepage")return"";if(/Homepage Hero Feature/i.test(opportunity))return"WEBSITE_HOMEPAGE:HERO";if(/Supporting Homepage Module/i.test(opportunity))return"WEBSITE_HOMEPAGE:MODULE";return"WEBSITE_HOMEPAGE:OTHER";}
function isHomepageOpportunity(item:ScheduleItem){return item.channel==="Website Homepage";}
function rangesOverlap(aStart:string,aEnd:string,bStart:string,bEnd:string){return aStart<=bEnd&&bStart<=aEnd;}
function validHttpUrl(value:string){try{const u=new URL(value);return u.protocol==="http:"||u.protocol==="https:";}catch{return false;}}

export default function CampaignVisualProductionBridge(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  const memory:VisualMap=readStored();
  campaignInstance();

  const sourceFor=(label:string)=>{const product=label.replace(/\s·\sAI lifestyle concept$/i,"").trim();for(const card of Array.from(document.querySelectorAll<HTMLElement>("article.creative-card"))){const title=card.querySelector("h3")?.textContent?.trim()??"";if(title===`${product} · primary product image`){const img=card.querySelector<HTMLImageElement>("img");if(img?.src)return img.src;}}return "";};
  const renderGenerated=(card:HTMLElement,label:string)=>{const url=memory[label];if(!url)return;const preview=card.querySelector<HTMLElement>(".creative-preview");if(!preview)return;if(preview.querySelector("img[data-lmg-generated='1']"))return;preview.innerHTML="";const img=document.createElement("img");img.src=url;img.alt=label;img.dataset.lmgGenerated="1";img.style.width="100%";img.style.height="auto";img.style.borderRadius="12px";preview.appendChild(img);};

  const enhanceStep5A=()=>{const headings=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading"));const heading=headings.find(h=>h.textContent?.includes("Campaign Visual Library"));const section=heading?.closest<HTMLElement>(".campaign-stage-panel");if(!section)return;const button=Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Campaign Visual Library/i.test(b.textContent??""));if(!button)return;const checkedProducts=Array.from(document.querySelectorAll<HTMLInputElement>(".campaign-table tbody input[type='checkbox']:checked"));let blocker=section.querySelector<HTMLElement>("[data-lmg-visual-gate='1']");if(checkedProducts.length>0){if(button.disabled)button.disabled=false;button.removeAttribute("title");blocker?.remove();}else{if(!blocker){blocker=document.createElement("p");blocker.dataset.lmgVisualGate="1";blocker.className="gate-blocker";button.insertAdjacentElement("afterend",blocker);}setText(blocker,"Select at least one product in Step 2 to activate the Campaign Visual Library. Messaging approval does not control Step 5A.");button.title="Select at least one product in Step 2";}};

  const enhanceGeneratorButtons=()=>{for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>("button"))){if(button.textContent?.trim()!=="Generate Lifestyle Image"||button.dataset.lmgVisualGenerator==="1")continue;const card=button.closest<HTMLElement>("article.creative-card");if(!card)continue;const label=card.querySelector("h3")?.textContent?.trim()??"";if(!label)continue;button.dataset.lmgVisualGenerator="1";renderGenerated(card,label);button.addEventListener("click",async(event)=>{event.preventDefault();event.stopImmediatePropagation();const prompt=card.querySelector<HTMLElement>(".creative-preview p")?.textContent?.trim()??"";if(!prompt){button.textContent="Missing image brief";return;}button.disabled=true;button.textContent="Generating lifestyle image…";try{const response=await fetch("/api/campaigns/visual-generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,sourceImageUrl:sourceFor(label)})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to generate image");memory[label]=String(data.imageUrl);writeStored(memory);renderGenerated(card,label);button.textContent="Generate New Alternative";}catch(error){button.textContent=error instanceof Error?error.message:"Generation failed";}finally{button.disabled=false;}},true);}};

  const enhancePinterestCard=(card:HTMLElement)=>{if(card.dataset.lmgPinterestFields==="1")return;const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"";if(channel!=="Pinterest")return;card.dataset.lmgPinterestFields="1";const headlineInput=Array.from(card.querySelectorAll<HTMLInputElement>("input")).find(i=>i.closest("label")?.textContent?.includes("Headline"));const body=card.querySelector<HTMLTextAreaElement>(".creative-copy-edit textarea");const anchor=card.querySelector(".creative-copy-edit");if(!anchor)return;const panel=document.createElement("div");panel.className="creative-copy-edit";panel.dataset.lmgPinterestCopy="1";panel.innerHTML=`<label>On-image copy<input data-pin-overlay maxlength="70" placeholder="Short headline displayed on the Pin image"></label><label>Pin title<input data-pin-title maxlength="100" placeholder="Pinterest Pin title"></label><label class="editor-wide">Pin description<textarea data-pin-description rows="4" maxlength="800" placeholder="Discovery / SEO description; not normally shown in the home feed"></textarea></label><p class="editor-wide creative-spec"><strong>Pinterest visual spec:</strong> Standard Pin · 2:3 portrait · 1000 × 1500 recommended. Keep on-image copy short and legible; preserve a clean no-text master image in the Campaign Visual Library for reuse on other channels.</p>`;anchor.insertAdjacentElement("afterend",panel);const overlay=panel.querySelector<HTMLInputElement>("[data-pin-overlay]");const title=panel.querySelector<HTMLInputElement>("[data-pin-title]");const desc=panel.querySelector<HTMLTextAreaElement>("[data-pin-description]");if(overlay)overlay.value=headlineInput?.value??"";if(title)title.value=headlineInput?.value??"";if(desc)desc.value=body?.value??"";};

  const findCopyInput=(card:HTMLElement,label:string)=>Array.from(card.querySelectorAll<HTMLInputElement>(".creative-copy-edit input")).find(i=>i.closest("label")?.textContent?.trim().startsWith(label));
  const ensureLivePreview=(card:HTMLElement)=>{const imagePreview=Array.from(card.querySelectorAll<HTMLElement>(".creative-preview")).find(p=>!!p.querySelector("img"));if(!imagePreview)return;imagePreview.classList.add("lmg-live-creative-preview");let overlay=imagePreview.querySelector<HTMLElement>("[data-lmg-preview-overlay='1']");if(!overlay){overlay=document.createElement("div");overlay.dataset.lmgPreviewOverlay="1";overlay.className="lmg-preview-overlay";overlay.innerHTML='<div class="lmg-preview-copy"><strong data-lmg-preview-headline></strong><span data-lmg-preview-body></span><b data-lmg-preview-cta></b></div>';imagePreview.appendChild(overlay);}const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"";const headline=findCopyInput(card,"Headline")?.value??"";const cta=findCopyInput(card,"CTA")?.value??"";const body=card.querySelector<HTMLTextAreaElement>(".creative-copy-edit textarea")?.value??"";const pinOverlay=card.querySelector<HTMLInputElement>("[data-pin-overlay]")?.value?.trim();const h=overlay.querySelector<HTMLElement>("[data-lmg-preview-headline]");const b=overlay.querySelector<HTMLElement>("[data-lmg-preview-body]");const c=overlay.querySelector<HTMLElement>("[data-lmg-preview-cta]");setText(h,channel==="Pinterest"&&pinOverlay?pinOverlay:headline);setText(b,channel==="Pinterest"?"":body);if(b)b.style.display=channel==="Pinterest"?"none":"-webkit-box";setText(c,cta);imagePreview.dataset.lmgPreviewChannel=channel;};

  const opportunityKey=(card:HTMLElement)=>`${campaignInstance()}::${card.querySelector(".eyebrow")?.textContent?.trim()??""}::${card.querySelector("h3")?.textContent?.trim()??""}`;
  const isApproved=(card:HTMLElement)=>card.querySelector(".creative-version")?.textContent?.includes("APPROVED")??false;
  const campaignDates=()=>{const dates=Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]')).map(i=>i.value).filter(Boolean);return{start:dates[0]??new Date().toISOString().slice(0,10),end:dates[1]??dates[0]??new Date().toISOString().slice(0,10)};};
  const conflictFor=(key:string,item:ScheduleItem,startDate:string,endDate:string)=>{const slot=item.slot||homepageSlot(item.channel,item.opportunity);if(!slot)return null;for(const[otherKey,other]of Object.entries(readScheduled())){if(otherKey===key||other.status!=="SCHEDULED")continue;const otherSlot=other.slot||homepageSlot(other.channel,other.opportunity);if(otherSlot!==slot||!other.startDate||!other.endDate)continue;if(rangesOverlap(startDate,endDate,other.startDate,other.endDate))return other;}return null;};

  const renderStep8Queue=()=>{
    const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;
    const scheduled=readScheduled();
    let panel=document.querySelector<HTMLElement>("[data-lmg-step8='1']");
    const prefix=`${campaignInstance()}::`;
    const entries=Object.entries(scheduled).filter(([key])=>key.startsWith(prefix));
    if(!entries.length){panel?.remove();return;}
    if(!panel){panel=document.createElement("section");panel.dataset.lmgStep8="1";panel.className="campaign-stage-panel lmg-step8-panel";section.insertAdjacentElement("afterend",panel);}
    const defaultDates=campaignDates();
    panel.innerHTML=`<div class="stage-heading"><span>8</span><div><p class="eyebrow">Scheduling preflight</p><h2>Approved opportunities ready for scheduling</h2></div></div><p class="approval-note">Confirm timing and destination before external publication. Homepage hero/module reservations are checked for conflicts before scheduling.</p><div class="lmg-schedule-list">${entries.map(([key,item])=>{const start=item.startDate||defaultDates.start,end=item.endDate||defaultDates.end,home=isHomepageOpportunity(item),status=item.status||"QUEUED";return `<article class="lmg-schedule-item" data-schedule-key="${key}"><div class="lmg-schedule-item-head"><strong>${status==="SCHEDULED"?"✓ Scheduled":"Queued"}</strong><span><b>${item.channel}</b> · ${item.opportunity}</span></div><div class="lmg-schedule-fields"><label>Start date<input type="date" data-schedule-start value="${start}"></label><label>End date<input type="date" data-schedule-end value="${end}"></label>${home?`<label class="lmg-destination-field">Destination product URL<input type="url" data-schedule-url value="${item.destinationUrl??""}" placeholder="https://laughingmoosegifts.com/product/..." required></label>`:""}</div><p class="lmg-schedule-status" data-schedule-status>${status==="SCHEDULED"?"Reservation confirmed. This opportunity is ready for the channel publication executor.":"Not yet scheduled."}</p><button type="button" data-confirm-schedule ${status==="SCHEDULED"?"disabled":""}>${status==="SCHEDULED"?"Scheduled":"Check Conflict & Confirm Schedule"}</button></article>`}).join("")}</div>`;
    for(const row of Array.from(panel.querySelectorAll<HTMLElement>(".lmg-schedule-item"))){const key=row.dataset.scheduleKey??"";const button=row.querySelector<HTMLButtonElement>("[data-confirm-schedule]");if(!button||button.disabled)continue;button.addEventListener("click",()=>{const latest=readScheduled();const item=latest[key];if(!item)return;const start=row.querySelector<HTMLInputElement>("[data-schedule-start]")?.value??"";const end=row.querySelector<HTMLInputElement>("[data-schedule-end]")?.value??"";const url=row.querySelector<HTMLInputElement>("[data-schedule-url]")?.value.trim()??"";const status=row.querySelector<HTMLElement>("[data-schedule-status]");if(!start||!end||start>end){setText(status,"Choose a valid start and end date before scheduling.");row.dataset.scheduleState="error";return;}if(isHomepageOpportunity(item)&&!validHttpUrl(url)){setText(status,"A valid destination product URL is required for homepage hero/module creative.");row.dataset.scheduleState="error";return;}const slot=homepageSlot(item.channel,item.opportunity);const conflict=conflictFor(key,{...item,slot},start,end);if(conflict){setText(status,`Scheduling conflict: ${conflict.opportunity} already occupies this homepage slot from ${conflict.startDate} through ${conflict.endDate}. Change the dates before scheduling.`);row.dataset.scheduleState="conflict";return;}latest[key]={...item,status:"SCHEDULED",startDate:start,endDate:end,destinationUrl:url||undefined,slot};writeScheduled(latest);row.dataset.scheduleState="scheduled";renderStep8Queue();enhanceIncrementalScheduling();},true);}
  };
  const enhanceIncrementalScheduling=()=>{
    const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;
    const button=Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find(b=>b.textContent?.includes("Continue to Step 8")||b.textContent?.includes("Approved Opportunit")||b.textContent?.includes("No Newly Approved"));if(!button)return;
    const cards=Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"));
    const scheduled=readScheduled();
    const eligible=cards.filter(card=>isApproved(card)&&!scheduled[opportunityKey(card)]);
    button.disabled=eligible.length===0;
    button.textContent=eligible.length?`Send ${eligible.length} Approved Opportunit${eligible.length===1?"y":"ies"} to Scheduling Preflight`:"No Newly Approved Opportunities to Schedule";
    if(button.dataset.lmgIncrementalSchedule!=="1"){
      button.dataset.lmgIncrementalSchedule="1";
      button.addEventListener("click",event=>{
        event.preventDefault();event.stopImmediatePropagation();
        const latest=readScheduled();
        const currentCards=Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"));
        const now=new Date().toISOString();
        for(const card of currentCards){if(!isApproved(card))continue;const key=opportunityKey(card);if(latest[key])continue;const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"",opportunity=card.querySelector("h3")?.textContent?.trim()??"";latest[key]={queuedAt:now,channel,opportunity,status:"QUEUED",slot:homepageSlot(channel,opportunity)||undefined};}
        writeScheduled(latest);renderStep8Queue();enhanceIncrementalScheduling();
      },true);
    }
    renderStep8Queue();
  };

  const enhanceStep7=()=>{const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return false;for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){enhancePinterestCard(card);const select=card.querySelector<HTMLSelectElement>("select");if(select){const apply=()=>{const option=select.options[select.selectedIndex];if(!option)return;const label=labelFromOption(option.textContent??"");if(memory[label])renderGenerated(card,label);ensureLivePreview(card);};apply();if(select.dataset.lmgVisualSelect!=="1"){select.dataset.lmgVisualSelect="1";select.addEventListener("change",apply);}}ensureLivePreview(card);if(card.dataset.lmgPreviewEvents!=="1"){card.dataset.lmgPreviewEvents="1";card.addEventListener("input",()=>ensureLivePreview(card));}}enhanceIncrementalScheduling();return true;};

  const enhanceBase=()=>{enhanceStep5A();enhanceGeneratorButtons();enhanceStep7();};
  requestAnimationFrame(enhanceBase);

  let step7Observer:MutationObserver|null=null;
  if(!document.querySelector("#creative-approval")){
    step7Observer=new MutationObserver(()=>{
      if(!document.querySelector("#creative-approval"))return;
      step7Observer?.disconnect();step7Observer=null;
      requestAnimationFrame(()=>{enhanceGeneratorButtons();enhanceStep7();});
    });
    const root=document.querySelector("main")??document.body;
    step7Observer.observe(root,{childList:true,subtree:true});
  }

  const onInteraction=(event:Event)=>{
    const target=event.target as HTMLElement|null;
    if(event.type==="click"&&target?.closest("button")?.textContent?.includes("Approve Campaign Plan & Create Opportunity Assets"))renewCampaignInstance();
    requestAnimationFrame(enhanceBase);
  };
  document.addEventListener("change",onInteraction,true);
  document.addEventListener("click",onInteraction,true);
  return()=>{step7Observer?.disconnect();document.removeEventListener("change",onInteraction,true);document.removeEventListener("click",onInteraction,true);};
 },[]);
 return null;
}
