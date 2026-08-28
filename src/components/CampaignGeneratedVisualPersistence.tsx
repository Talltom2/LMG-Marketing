"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const PREFIX="lmg-campaign-generated-visuals-v2:";
type VisualMap=Record<string,string>;

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function clean(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function campaignId(){try{return localStorage.getItem(ACTIVE_KEY)||"builder-draft"}catch{return"builder-draft"}}
function key(){return `${PREFIX}${campaignId()}`}
function read():VisualMap{try{return JSON.parse(localStorage.getItem(key())??"{}") as VisualMap}catch{return{}}}
function write(value:VisualMap){try{localStorage.setItem(key(),JSON.stringify(value))}catch{}}
function visualSection(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="5A")??null}

export default function CampaignGeneratedVisualPersistence(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let frame=0,lastSignature="";

    const sync=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const section=visualSection();if(!section)return;
        const saved=read();
        let changed=false;

        for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
          const label=clean(text(card.querySelector("h3")));if(!label)continue;
          const preview=card.querySelector<HTMLElement>(".creative-preview");if(!preview)continue;
          let generated=preview.querySelector<HTMLImageElement>("img[data-lmg-generated='1']");

          if(!generated&&saved[label]){
            const brief=preview.querySelector("p")?.textContent?.trim()??card.dataset.lmgImageBrief??"";
            preview.innerHTML="";
            generated=document.createElement("img");
            generated.src=saved[label];generated.alt=label;generated.dataset.lmgGenerated="1";
            generated.style.width="100%";generated.style.height="auto";generated.style.borderRadius="12px";
            preview.appendChild(generated);
            if(brief){const p=document.createElement("p");p.textContent=brief;p.style.display="none";p.dataset.lmgPreservedBrief="1";preview.appendChild(p)}
          }

          if(generated?.src&&saved[label]!==generated.src){saved[label]=generated.src;changed=true}
        }

        const signature=JSON.stringify(saved);
        if(changed){write(saved);if(signature!==lastSignature){lastSignature=signature;document.dispatchEvent(new Event("lmg-builder-state-changed"))}}
        else lastSignature=signature;
      });
    };

    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
    document.addEventListener("click",sync,true);
    return()=>{observer.disconnect();document.removeEventListener("click",sync,true);cancelAnimationFrame(frame)};
  },[pathname]);

  return null;
}
