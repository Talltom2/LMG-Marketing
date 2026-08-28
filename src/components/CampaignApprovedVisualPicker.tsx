"use client";

import {useEffect} from "react";

const APPROVAL_KEY="lmg-campaign-approved-visuals-v1";
type ApprovalMap=Record<string,string[]>;
type VisualChoice={label:string;url:string;value:string};

function clean(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function readApprovals():ApprovalMap{try{return JSON.parse(localStorage.getItem(APPROVAL_KEY)??"{}") as ApprovalMap}catch{return{}}}
function campaignKey(){
  const labels=Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  const campaignLabel=labels.find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
  const input=campaignLabel?.querySelector<HTMLInputElement>("input");
  const name=input?.value.trim();
  if(name)return name.toLowerCase();
  const active=document.querySelector<HTMLElement>("[data-active-campaign-name]")?.dataset.activeCampaignName?.trim();
  return (active||"builder-draft").toLowerCase();
}
function visualLibrary(){
  const heading=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading")).find(h=>h.textContent?.includes("Campaign Visual Library"));
  return heading?.closest<HTMLElement>(".campaign-stage-panel")??null;
}
function approvedVisuals(select:HTMLSelectElement):VisualChoice[]{
  const library=visualLibrary();if(!library)return[];
  const saved=new Set(readApprovals()[campaignKey()]??[]);
  const optionByLabel=new Map<string,string>();
  for(const option of Array.from(select.options)){
    if(!option.value)continue;
    optionByLabel.set(clean(option.textContent?.trim()??""),option.value);
  }
  const choices:VisualChoice[]=[];
  const seen=new Set<string>();
  for(const card of Array.from(library.querySelectorAll<HTMLElement>("article.creative-card"))){
    const label=clean(card.querySelector("h3")?.textContent?.trim()??"");
    const status=card.querySelector(".creative-version")?.textContent?.toUpperCase()??"";
    const img=card.querySelector<HTMLImageElement>(".creative-preview img");
    const value=optionByLabel.get(label);
    if(!label||!img?.src||!value||(!status.includes("APPROVED")&&!saved.has(label)))continue;
    const key=`${label}::${img.currentSrc||img.src}`;
    if(seen.has(key))continue;seen.add(key);
    choices.push({label,url:img.currentSrc||img.src,value});
  }
  return choices;
}

export default function CampaignApprovedVisualPicker(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    let frame=0;
    const enhance=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;
        for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
          const select=card.querySelector<HTMLSelectElement>("select");if(!select)continue;
          const label=select.closest<HTMLLabelElement>("label");if(!label||!/^Campaign visual/i.test(label.textContent?.trim()??""))continue;
          label.classList.add("lmg-native-visual-select-hidden");
          let picker=card.querySelector<HTMLElement>("[data-lmg-approved-visual-picker='1']");
          if(!picker){
            picker=document.createElement("div");
            picker.dataset.lmgApprovedVisualPicker="1";
            picker.className="lmg-approved-visual-picker";
            label.insertAdjacentElement("afterend",picker);
          }
          const choices=approvedVisuals(select);
          const current=select.value;
          picker.innerHTML=`<div class="lmg-approved-visual-picker-head"><strong>Approved campaign image</strong><span>${choices.length?`${choices.length} approved image${choices.length===1?"":"s"} available`:"No approved images yet"}</span></div>${choices.length?`<div class="lmg-approved-visual-list">${choices.map(c=>`<button type="button" class="lmg-approved-visual-choice${c.value===current?" selected":""}" data-visual-value="${encodeURIComponent(c.value)}"><img src="${c.url.replace(/"/g,"&quot;")}" alt=""><span>${c.label.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>${c.value===current?"<b>Selected</b>":""}</button>`).join("")}</div>`:`<p class="gate-blocker">Approve one or more images in the Campaign Visual Library before selecting an image for this opportunity.</p>`}`;
          for(const button of Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-visual-value]"))){
            button.addEventListener("click",()=>{
              const value=decodeURIComponent(button.dataset.visualValue??"");
              if(!value)return;
              select.value=value;
              select.dispatchEvent(new Event("change",{bubbles:true}));
              enhance();
            },{once:true});
          }
        }
      });
    };
    enhance();
    const observer=new MutationObserver(enhance);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","src","value"]});
    document.addEventListener("change",enhance,true);
    document.addEventListener("click",enhance,true);
    return()=>{observer.disconnect();document.removeEventListener("change",enhance,true);document.removeEventListener("click",enhance,true);cancelAnimationFrame(frame)};
  },[]);
  return null;
}
