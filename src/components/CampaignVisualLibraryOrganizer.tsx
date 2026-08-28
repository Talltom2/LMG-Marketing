"use client";

import {useEffect} from "react";

function normalizeUrl(value:string){
  try{
    const u=new URL(value,location.origin);
    u.hash="";
    u.protocol="https:";
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    const path=decodeURIComponent(u.pathname)
      .replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,"")
      .replace(/-scaled(?=\.[a-z0-9]+$)/i,"")
      .replace(/\/{2,}/g,"/")
      .replace(/\/$/,"");
    u.pathname=path;
    u.search="";
    return `${u.hostname}${u.pathname}`.toLowerCase();
  }catch{
    return value.trim().toLowerCase()
      .replace(/[?#].*$/,"")
      .replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,"")
      .replace(/-scaled(?=\.[a-z0-9]+$)/i,"");
  }
}

function cleanOptionLabel(value:string){
  return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim();
}

export default function CampaignVisualLibraryOrganizer(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;

    let frame=0;
    const organize=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const headings=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading"));
        const heading=headings.find(h=>h.textContent?.includes("Campaign Visual Library"));
        const section=heading?.closest<HTMLElement>(".campaign-stage-panel");
        if(!section)return;

        section.dataset.lmgVisualLibraryOrganized="1";
        const grid=section.querySelector<HTMLElement>(".creative-card-grid");
        if(!grid)return;
        grid.classList.add("lmg-visual-library-grid");

        const selectedLabels=new Set<string>();
        const approval=document.querySelector<HTMLElement>("#creative-approval");
        if(approval){
          for(const select of Array.from(approval.querySelectorAll<HTMLSelectElement>("select"))){
            const text=select.selectedOptions[0]?.textContent?.trim();
            if(text&&text!=="Choose visual")selectedLabels.add(cleanOptionLabel(text));
          }
        }

        const cards=Array.from(grid.querySelectorAll<HTMLElement>(":scope > article.creative-card"));
        const bestByImage=new Map<string,{card:HTMLElement;score:number}>();
        const duplicateCards=new Set<HTMLElement>();

        const scoreFor=(card:HTMLElement)=>{
          const status=card.querySelector(".creative-version")?.textContent?.trim().toUpperCase()??"";
          const label=card.querySelector("h3")?.textContent?.trim()??"";
          const selected=status.includes("APPROVED")||selectedLabels.has(label);
          const ai=(card.querySelector(".eyebrow")?.textContent??"").toLowerCase().includes("ai visual");
          return (selected?100:0)+(status.includes("RECOMMENDED")?20:0)+(ai?5:0);
        };

        for(const card of cards){
          card.classList.remove("lmg-visual-thumbnail","lmg-visual-selected","lmg-visual-brief","lmg-visual-duplicate");
          card.removeAttribute("aria-hidden");
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const ai=(card.querySelector(".eyebrow")?.textContent??"").toLowerCase().includes("ai visual");
          const approveButton=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve for Campaign|Approved/i.test(b.textContent??""));
          if(ai&& !img?.src){
            approveButton?.remove();
          }
          if(!img?.src)continue;
          const key=normalizeUrl(img.currentSrc||img.src);
          const score=scoreFor(card);
          const existing=bestByImage.get(key);
          if(!existing){bestByImage.set(key,{card,score});continue;}
          if(score>existing.score){duplicateCards.add(existing.card);bestByImage.set(key,{card,score});}
          else duplicateCards.add(card);
        }

        for(const card of cards){
          if(duplicateCards.has(card)){
            card.classList.add("lmg-visual-duplicate");
            card.setAttribute("aria-hidden","true");
            continue;
          }
          const status=card.querySelector(".creative-version")?.textContent?.trim().toUpperCase()??"";
          const label=card.querySelector("h3")?.textContent?.trim()??"";
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const selected=status.includes("APPROVED")||selectedLabels.has(label);
          if(selected){
            card.classList.add("lmg-visual-selected");
            continue;
          }
          if(img?.src){
            card.classList.add("lmg-visual-thumbnail");
            img.loading="lazy";
          }else{
            card.classList.add("lmg-visual-brief");
          }
        }

        let availableHeading=section.querySelector<HTMLElement>("[data-lmg-available-visuals-heading='1']");
        const thumbnails=cards.filter(c=>c.classList.contains("lmg-visual-thumbnail")).length;
        const selected=cards.filter(c=>c.classList.contains("lmg-visual-selected")).length;
        const duplicates=duplicateCards.size;
        if(!availableHeading){
          availableHeading=document.createElement("p");
          availableHeading.dataset.lmgAvailableVisualsHeading="1";
          availableHeading.className="lmg-visual-library-summary";
          grid.insertAdjacentElement("beforebegin",availableHeading);
        }
        availableHeading.textContent=`${selected} selected full-size · ${thumbnails} available thumbnails${duplicates?` · ${duplicates} duplicate${duplicates===1?"":"s"} hidden`:""}. AI-generated images are added to this library automatically.`;
      });
    };

    organize();
    const observer=new MutationObserver(organize);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","srcset","class","value"]});
    document.addEventListener("change",organize,true);
    document.addEventListener("click",organize,true);
    return()=>{observer.disconnect();document.removeEventListener("change",organize,true);document.removeEventListener("click",organize,true);cancelAnimationFrame(frame);};
  },[]);
  return null;
}
