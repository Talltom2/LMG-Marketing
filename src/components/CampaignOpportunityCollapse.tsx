"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-opportunity-collapse-v1";
type CollapseMap=Record<string,boolean>;

function readState():CollapseMap{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)??"{}") as CollapseMap}catch{return{}}}
function writeState(value:CollapseMap){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}}
function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function campaignKey(){
 const labels=Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
 const campaignLabel=labels.find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
 const name=campaignLabel?.querySelector<HTMLInputElement>("input")?.value.trim();
 return (name||"builder-draft").toLowerCase();
}
function opportunityCards(){
 const channels=document.querySelector<HTMLElement>("#channels");
 if(!channels)return [] as HTMLElement[];
 const explicit=Array.from(channels.querySelectorAll<HTMLElement>(".opportunity-option"));
 if(explicit.length)return explicit;
 return Array.from(channels.querySelectorAll<HTMLLabelElement>("label"))
  .filter(label=>!label.classList.contains("asset-select")&&!!label.querySelector<HTMLInputElement>('input[type="checkbox"]')&&!!label.querySelector("strong"))
  .map(label=>label as HTMLElement);
}
function optionKey(option:HTMLElement){
 const channel=option.closest<HTMLElement>(".opportunity-channel-card");
 const asset=text(channel?.querySelector(".asset-select strong"))||text(channel?.querySelector("h3"))||"channel";
 const label=text(option.querySelector("strong"))||text(option.querySelector("span"))||"opportunity";
 return `${campaignKey()}::${asset}::${label}`.toLowerCase();
}
function apply(option:HTMLElement,collapsed:boolean){
 option.classList.toggle("lmg-opportunity-collapsed",collapsed);
 option.dataset.lmgOpportunityCollapsed=collapsed?"1":"0";
 const button=option.querySelector<HTMLButtonElement>("[data-lmg-opportunity-toggle='1']");
 if(button){
  button.textContent=collapsed?"Expand":"Collapse";
  button.setAttribute("aria-expanded",collapsed?"false":"true");
  button.title=collapsed?"Expand opportunity details":"Collapse opportunity details";
 }
}

export default function CampaignOpportunityCollapse(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  let frame=0;
  const enhance=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const saved=readState();
    for(const option of opportunityCards()){
     option.classList.add("lmg-opportunity-collapsible");
     if(option.dataset.lmgOpportunityCollapseReady!=="1"){
      option.dataset.lmgOpportunityCollapseReady="1";
      const button=document.createElement("button");
      button.type="button";
      button.dataset.lmgOpportunityToggle="1";
      button.className="lmg-opportunity-toggle";
      button.textContent="Collapse";
      button.setAttribute("aria-label","Collapse opportunity details");
      button.addEventListener("click",event=>{
       event.preventDefault();
       event.stopPropagation();
       const next=!option.classList.contains("lmg-opportunity-collapsed");
       const all=readState();all[optionKey(option)]=next;writeState(all);apply(option,next);
      },true);
      option.appendChild(button);
     }
     const stored=saved[optionKey(option)];
     apply(option,typeof stored==="boolean"?stored:false);
    }
   });
  };
  enhance();
  const observer=new MutationObserver(enhance);observer.observe(document.body,{subtree:true,childList:true});
  document.addEventListener("change",enhance,true);
  return()=>{observer.disconnect();document.removeEventListener("change",enhance,true);cancelAnimationFrame(frame)};
 },[]);
 return null;
}
