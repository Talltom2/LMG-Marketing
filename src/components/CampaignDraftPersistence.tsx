"use client";

import {useEffect} from "react";

const KEY="lmg-marketing-campaign-builder-draft-v1";
type Draft={name?:string;startDate?:string;endDate?:string;objective?:string;templateName?:string};

function setNativeValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

export default function CampaignDraftPersistence(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    let restoring=true;
    const root=document.querySelector<HTMLElement>(".campaign-details-card");
    if(!root)return;

    const inputs=Array.from(root.querySelectorAll<HTMLInputElement>("input"));
    const name=inputs.find(i=>i.type!=="date");
    const dates=inputs.filter(i=>i.type==="date");
    const start=dates[0],end=dates[1];
    const objective=root.querySelector<HTMLTextAreaElement>("textarea");
    const templateButtons=Array.from(root.querySelectorAll<HTMLButtonElement>(".template-card"));

    try{
      const raw=localStorage.getItem(KEY);
      if(raw){
        const d=JSON.parse(raw) as Draft;
        if(d.templateName){
          const btn=templateButtons.find(b=>b.textContent?.trim().startsWith(d.templateName!));
          if(btn&&!btn.classList.contains("selected"))btn.click();
        }
        queueMicrotask(()=>{
          if(name&&d.name!=null)setNativeValue(name,d.name);
          if(start&&d.startDate)setNativeValue(start,d.startDate);
          if(end&&d.endDate)setNativeValue(end,d.endDate);
          if(objective&&d.objective!=null)setNativeValue(objective,d.objective);
          restoring=false;
        });
      }else restoring=false;
    }catch{restoring=false;}

    const save=()=>{
      if(restoring)return;
      const selected=templateButtons.find(b=>b.classList.contains("selected"));
      const templateName=selected?.querySelector("strong")?.textContent?.trim();
      const d:Draft={name:name?.value,startDate:start?.value,endDate:end?.value,objective:objective?.value,templateName};
      try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}
    };

    root.addEventListener("input",save);
    root.addEventListener("change",save);
    templateButtons.forEach(b=>b.addEventListener("click",()=>setTimeout(save,0)));
    window.addEventListener("pagehide",save);
    return()=>{
      root.removeEventListener("input",save);
      root.removeEventListener("change",save);
      window.removeEventListener("pagehide",save);
    };
  },[]);
  return null;
}
