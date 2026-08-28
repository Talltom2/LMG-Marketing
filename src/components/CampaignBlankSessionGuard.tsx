"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";

function setReactValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

export default function CampaignBlankSessionGuard(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let blank=false;
    try{
      if(localStorage.getItem(ACTIVE_KEY))return;
      const raw=localStorage.getItem(LEARNING_DRAFT_KEY);
      if(raw){const d=JSON.parse(raw) as {learningSummary?:string};blank=/Blank campaign/i.test(d.learningSummary??"")}
    }catch{}
    if(!blank)return;

    let tries=0,cancelled=false;
    const apply=()=>{
      if(cancelled)return;
      const step1=document.querySelector<HTMLElement>(".campaign-details-card");
      const rows=document.querySelectorAll(".campaign-table tbody tr");
      const channels=document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card");
      if(!step1||!rows.length||!channels.length){if(++tries<100)window.setTimeout(apply,100);return}

      // Clear channels first so blank date/messaging values cannot feed a derived calendar.
      document.querySelectorAll<HTMLInputElement>('#channels .asset-select input[type="checkbox"]:checked').forEach(box=>box.click());
      document.querySelectorAll<HTMLInputElement>('.campaign-table tbody input[type="checkbox"]:checked').forEach(box=>box.click());

      const inputs=Array.from(step1.querySelectorAll<HTMLInputElement>("input"));
      const name=inputs.find(i=>i.type!=="date");
      const objective=step1.querySelector<HTMLTextAreaElement>("textarea");
      if(name)setReactValue(name,"");
      if(objective)setReactValue(objective,"");

      const messaging=Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>p.querySelector(".stage-heading > span")?.textContent?.trim()==="5");
      if(messaging){
        messaging.querySelectorAll<HTMLInputElement>(".creative-editor input").forEach(input=>setReactValue(input,""));
        messaging.querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea").forEach(area=>setReactValue(area,""));
      }

      // No template is visually preselected on a new blank campaign. The first
      // actual template click lets React take over normally.
      let keepBlank=true;
      const clearTemplateSelection=()=>{if(keepBlank)document.querySelectorAll(".template-card.selected").forEach(el=>el.classList.remove("selected"))};
      clearTemplateSelection();
      const timer=window.setInterval(clearTemplateSelection,150);
      window.setTimeout(()=>window.clearInterval(timer),1800);
      const choose=(event:Event)=>{if((event.target as HTMLElement|null)?.closest(".template-card")){keepBlank=false;window.clearInterval(timer);document.removeEventListener("click",choose,true)}};
      document.addEventListener("click",choose,true);
    };
    apply();
    return()=>{cancelled=true};
  },[pathname]);

  return null;
}
