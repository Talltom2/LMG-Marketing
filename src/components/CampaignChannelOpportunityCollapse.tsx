"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-channel-opportunity-collapse-v1";
const OLD_ITEM_KEY="lmg-campaign-opportunity-collapse-v2";
type SavedState=Record<string,boolean>;

function readState():SavedState{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)??"{}") as SavedState}catch{return{}}}
function writeState(value:SavedState){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}}
function campaignKey(){
 const label=Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
 return (label?.querySelector<HTMLInputElement>("input")?.value.trim()||"builder-draft").toLowerCase();
}
function channelKey(card:HTMLElement){
 const name=card.querySelector<HTMLElement>(".asset-select strong")?.textContent?.trim()||"channel";
 return `${campaignKey()}::${name}`.toLowerCase();
}
function apply(card:HTMLElement,collapsed:boolean){
 const layer=card.querySelector<HTMLElement>(".opportunity-layer");
 const button=card.querySelector<HTMLButtonElement>("[data-lmg-channel-collapse='1']");
 if(!layer||!button)return;
 for(const child of Array.from(layer.children) as HTMLElement[])child.hidden=collapsed;
 card.classList.toggle("lmg-channel-opportunities-collapsed",collapsed);
 layer.classList.toggle("lmg-channel-opportunities-collapsed-layer",collapsed);
 button.textContent=collapsed?"⌄":"⌃";
 button.setAttribute("aria-expanded",collapsed?"false":"true");
 button.setAttribute("aria-label",collapsed?"Expand opportunities":"Collapse opportunities");
 button.title=collapsed?"Expand opportunities":"Collapse opportunities";
}

export default function CampaignChannelOpportunityCollapse(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  try{localStorage.removeItem(OLD_ITEM_KEY)}catch{}
  let frame=0;
  const enhance=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const saved=readState();
    for(const card of Array.from(document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card"))){
     const layer=card.querySelector<HTMLElement>(".opportunity-layer");
     if(!layer)continue;
     let button=card.querySelector<HTMLButtonElement>("[data-lmg-channel-collapse='1']");
     if(!button){
      button=document.createElement("button");
      button.type="button";
      button.dataset.lmgChannelCollapse="1";
      button.className="lmg-channel-collapse-toggle";
      card.appendChild(button);
      button.addEventListener("click",event=>{
       event.preventDefault();event.stopPropagation();
       const next=!card.classList.contains("lmg-channel-opportunities-collapsed");
       const all=readState();all[channelKey(card)]=next;writeState(all);apply(card,next);
      });
     }
     apply(card,saved[channelKey(card)]===true);
    }
   });
  };
  enhance();
  const observer=new MutationObserver(enhance);observer.observe(document.body,{subtree:true,childList:true});
  return()=>{observer.disconnect();cancelAnimationFrame(frame)};
 },[]);
 return null;
}
