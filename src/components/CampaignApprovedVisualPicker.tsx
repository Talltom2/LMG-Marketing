"use client";

import {useEffect} from "react";

const APPROVAL_KEY="lmg-campaign-approved-visuals-v1";
type ApprovalMap=Record<string,string[]>;

function clean(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function readApprovals():ApprovalMap{try{return JSON.parse(localStorage.getItem(APPROVAL_KEY)??"{}") as ApprovalMap}catch{return{}}}
function campaignKey(){
  const campaignLabel=Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find(l=>/^Campaign name/i.test(text(l)));
  const name=campaignLabel?.querySelector<HTMLInputElement>("input")?.value.trim();
  if(name)return name.toLowerCase();
  const active=document.querySelector<HTMLElement>("[data-active-campaign-name]")?.dataset.activeCampaignName?.trim();
  return (active||"builder-draft").toLowerCase();
}
function visualLibrary(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="5A")??null}
function approvedLabels(){
  const labels=new Set(readApprovals()[campaignKey()]??[]);
  const library=visualLibrary();
  if(library)for(const card of Array.from(library.querySelectorAll<HTMLElement>("article.creative-card"))){
    const label=clean(text(card.querySelector("h3"))),status=text(card.querySelector(".creative-version")).toUpperCase(),img=card.querySelector<HTMLImageElement>(".creative-preview img");
    if(label&&img?.src&&status.includes("APPROVED"))labels.add(label);
  }
  return labels;
}

export default function CampaignApprovedVisualPicker(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    let frame=0,resetting=false,timer=0;

    const enhance=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;
        const approved=approvedLabels();
        for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
          const select=Array.from(card.querySelectorAll<HTMLSelectElement>("select")).find(s=>/^Campaign visual/i.test(text(s.closest("label"))));
          if(!select)continue;
          for(const option of Array.from(select.options)){
            if(!option.value){option.hidden=false;option.disabled=false;continue}
            const allowed=approved.has(clean(text(option)));
            option.hidden=!allowed;
            option.disabled=!allowed;
          }
          const selected=select.selectedOptions[0];
          if(selected?.value&&selected.disabled&&!resetting){
            resetting=true;
            select.value="";
            select.dispatchEvent(new Event("change",{bubbles:true}));
            resetting=false;
          }
          select.title=approved.size?"Approved campaign images only":"Approve an image in the Campaign Visual Library first";
        }
      });
    };

    const schedule=()=>window.setTimeout(enhance,50);
    enhance();
    timer=window.setInterval(enhance,500);
    window.setTimeout(()=>window.clearInterval(timer),10000);
    document.addEventListener("click",schedule,true);
    document.addEventListener("change",schedule,true);
    document.addEventListener("lmg-builder-state-changed",schedule as EventListener,true);
    return()=>{window.clearInterval(timer);cancelAnimationFrame(frame);document.removeEventListener("click",schedule,true);document.removeEventListener("change",schedule,true);document.removeEventListener("lmg-builder-state-changed",schedule as EventListener,true)};
  },[]);
  return null;
}
