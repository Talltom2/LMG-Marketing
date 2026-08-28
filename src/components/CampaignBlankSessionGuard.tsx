"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const BLANK_KEY="lmg-campaign-builder-blank-v1";
const READY_CLASS="lmg-campaign-builder-hydrated";
const LEGACY_DEFAULT_NAME="September Country Home Campaign";

function setReactValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

function reveal(){document.body.classList.add(READY_CLASS)}

export default function CampaignBlankSessionGuard(){
  const pathname=usePathname();

  useLayoutEffect(()=>{
    if(pathname!=="/campaigns"){document.body.classList.remove(READY_CLASS);return}
    document.body.classList.remove(READY_CLASS);

    let blank=false;
    try{blank=!localStorage.getItem(ACTIVE_KEY)&&sessionStorage.getItem(BLANK_KEY)==="1"}catch{reveal();return}

    // Existing/explicitly selected campaigns may still begin with the legacy
    // React placeholder for one render. Keep the visible title hidden until the
    // placeholder has been replaced by the selected campaign value.
    if(!blank){
      let cancelled=false,tries=0;
      const wait=()=>{
        if(cancelled)return;
        const step1=document.querySelector<HTMLElement>(".campaign-details-card");
        const input=step1?Array.from(step1.querySelectorAll<HTMLInputElement>("input")).find(i=>i.type!=="date"):null;
        if(input&&input.value!==LEGACY_DEFAULT_NAME){reveal();return}
        if(++tries<80){window.setTimeout(wait,50);return}
        reveal();
      };
      wait();
      return()=>{cancelled=true};
    }

    let tries=0,cancelled=false;
    const apply=()=>{
      if(cancelled)return;
      const step1=document.querySelector<HTMLElement>(".campaign-details-card");
      const rows=document.querySelectorAll(".campaign-table tbody tr");
      const channels=document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card");
      if(!step1||!rows.length||!channels.length){if(++tries<100)window.setTimeout(apply,50);else reveal();return}

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
        if(!anyChannel){
          const currentStep1=document.querySelector<HTMLElement>(".campaign-details-card");
          currentStep1?.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(input=>setReactValue(input,""));
        }
        // Reveal only after the blank state has replaced the server/React legacy
        // placeholder, so the old September title is never painted to the user.
        window.requestAnimationFrame(reveal);
      },80);

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
