"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const RESUME_OPPS_KEY="lmg-campaign-resume-opportunities-v1";
const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";

function setNative(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,"value")?.set?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

export default function CampaignFreshStartGuard(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let explicitResume=false;
    try{
      explicitResume=!!localStorage.getItem(RESUME_OPPS_KEY)||!!localStorage.getItem(LEARNING_DRAFT_KEY);
      if(!explicitResume)localStorage.removeItem(ACTIVE_KEY);
    }catch{}
    if(explicitResume)return;

    let tries=0;
    const blank=()=>{
      const root=document.querySelector<HTMLElement>(".campaign-details-card");
      if(!root){if(++tries<60)setTimeout(blank,100);return}
      const inputs=Array.from(root.querySelectorAll<HTMLInputElement>("input"));
      const name=inputs.find(i=>i.type!=="date");
      const dates=inputs.filter(i=>i.type==="date");
      const objective=root.querySelector<HTMLTextAreaElement>("textarea");
      if(name)setNative(name,"");
      dates.forEach(d=>setNative(d,""));
      if(objective)setNative(objective,"");

      document.querySelectorAll<HTMLInputElement>('.campaign-table tbody input[type="checkbox"]:checked').forEach(b=>b.click());
      document.querySelectorAll<HTMLInputElement>('#channels .asset-select input[type="checkbox"]:checked').forEach(b=>b.click());

      const messaging=Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>p.querySelector("h2")?.textContent?.includes("Edit and approve the campaign messaging"));
      messaging?.querySelectorAll<HTMLInputElement>("input").forEach(i=>setNative(i,""));
      messaging?.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(t=>setNative(t,""));

      window.dispatchEvent(new CustomEvent("lmg-active-campaign-change",{detail:{id:"",name:""}}));
    };
    const timer=setTimeout(blank,120);
    return()=>clearTimeout(timer);
  },[pathname]);
  return null;
}
