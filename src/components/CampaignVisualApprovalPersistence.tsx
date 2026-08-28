"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-approved-visuals-v1";
type ApprovalMap=Record<string,string[]>;

function readApprovals():ApprovalMap{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)??"{}") as ApprovalMap}catch{return{}}}
function writeApprovals(value:ApprovalMap){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}}
function clean(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function campaignKey(){
  const labels=Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  const campaignLabel=labels.find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
  const input=campaignLabel?.querySelector<HTMLInputElement>("input");
  const name=input?.value.trim();
  if(name)return name.toLowerCase();
  const active=document.querySelector<HTMLElement>("[data-active-campaign-name]")?.dataset.activeCampaignName?.trim();
  return (active||"builder-draft").toLowerCase();
}
function visualLabel(card:HTMLElement){return clean(card.querySelector("h3")?.textContent?.trim()??"")}
function isRealVisual(card:HTMLElement){return !!card.querySelector<HTMLImageElement>(".creative-preview img")}
function approveButton(card:HTMLElement){return Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve for Campaign|✓ Approved/i.test(b.textContent??""))}

export default function CampaignVisualApprovalPersistence(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  let restoring=false,frame=0;

  const restore=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    if(restoring)return;
    const heading=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading")).find(h=>h.textContent?.includes("Campaign Visual Library"));
    const section=heading?.closest<HTMLElement>(".campaign-stage-panel");
    if(!section)return;
    const saved=new Set(readApprovals()[campaignKey()]??[]);
    if(!saved.size)return;
    restoring=true;
    try{
     for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
      const label=visualLabel(card);if(!label||!saved.has(label)||!isRealVisual(card))continue;
      const status=card.querySelector(".creative-version")?.textContent?.toUpperCase()??"";
      if(status.includes("APPROVED"))continue;
      const button=approveButton(card);
      if(button&&!button.disabled)button.click();
     }
    }finally{restoring=false;}
   });
  };

  const onClick=(event:Event)=>{
   const button=(event.target as HTMLElement)?.closest<HTMLButtonElement>("button");
   if(!button||!/Approve for Campaign/i.test(button.textContent??""))return;
   const card=button.closest<HTMLElement>("article.creative-card");
   if(!card||!isRealVisual(card))return;
   const label=visualLabel(card);if(!label)return;
   const all=readApprovals(),key=campaignKey(),current=new Set(all[key]??[]);current.add(label);all[key]=[...current];writeApprovals(all);
  };

  document.addEventListener("click",onClick,true);
  const observer=new MutationObserver(restore);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","src"]});
  restore();
  return()=>{document.removeEventListener("click",onClick,true);observer.disconnect();cancelAnimationFrame(frame)};
 },[]);
 return null;
}
