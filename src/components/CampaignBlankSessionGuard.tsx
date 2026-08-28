"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const BLANK_KEY="lmg-campaign-builder-blank-v1";

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
    try{if(localStorage.getItem(ACTIVE_KEY)||sessionStorage.getItem(BLANK_KEY)!=="1")return}catch{return}

    let tries=0,cancelled=false;
    const apply=()=>{
      if(cancelled)return;
      const step1=document.querySelector<HTMLElement>(".campaign-details-card");
      const rows=document.querySelectorAll(".campaign-table tbody tr");
      const channels=document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card");
      if(!step1||!rows.length||!channels.length){if(++tries<100)window.setTimeout(apply,100);return}

      // Clear default channel/product selections before clearing visible fields.
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

      // Once React has applied the channel removals, blank the recommended dates
      // too. Calendar derivation is safe because a blank campaign has no channels.
      window.setTimeout(()=>{
        if(cancelled)return;
        const anyChannel=!!document.querySelector('#channels .asset-select input[type="checkbox"]:checked');
        if(anyChannel)return;
        const currentStep1=document.querySelector<HTMLElement>(".campaign-details-card");
        currentStep1?.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(input=>setReactValue(input,""));
      },120);

      // No template is visually preselected on a new blank campaign. The first
      // actual template click lets React take over normally.
      let keepBlank=true;
      const clearTemplateSelection=()=>{if(keepBlank)document.querySelectorAll(".template-card.selected").forEach(el=>el.classList.remove("selected"))};
      clearTemplateSelection();
      const timer=window.setInterval(clearTemplateSelection,150);
      window.setTimeout(()=>window.clearInterval(timer),1800);
      const choose=(event:Event)=>{if((event.target as HTMLElement|null)?.closest(".template-card")){keepBlank=false;sessionStorage.removeItem(BLANK_KEY);window.clearInterval(timer);document.removeEventListener("click",choose,true)}};
      document.addEventListener("click",choose,true);
    };
    apply();
    return()=>{cancelled=true};
  },[pathname]);

  return null;
}
