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
    return value.trim().toLowerCase().replace(/[?#].*$/,"").replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,"").replace(/-scaled(?=\.[a-z0-9]+$)/i,"");
  }
}

function cleanOptionLabel(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim();}
function campaignName(){return Array.from(document.querySelectorAll<HTMLInputElement>("input")).find(i=>i.closest("label")?.textContent?.trim().startsWith("Campaign name"))?.value?.trim()||"current campaign";}
function campaignObjective(){return Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea")).find(t=>t.closest("label")?.textContent?.trim().startsWith("Campaign objective"))?.value?.trim()||"increase qualified traffic and profitable sales";}
function fallbackBrief(label:string){const product=label.replace(/\s·\sAI lifestyle concept$/i,"").trim();return `Create a polished lifestyle marketing image for ${product} as part of the ${campaignName()} campaign. Preserve the actual product appearance and proportions from the source product photography. Build a warm, aspirational country-home setting around the real product without altering logos, patterns, colors, materials, or product shape. Composition should leave usable negative space for campaign copy. Campaign objective: ${campaignObjective()}`;}

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
        const originalGrid=section.querySelector<HTMLElement>(".creative-card-grid");
        if(!originalGrid)return;
        originalGrid.classList.add("lmg-visual-library-source-grid");

        let selectedGroup=section.querySelector<HTMLElement>("[data-lmg-selected-visuals='1']");
        let availableGroup=section.querySelector<HTMLElement>("[data-lmg-available-visuals='1']");
        if(!selectedGroup){selectedGroup=document.createElement("section");selectedGroup.dataset.lmgSelectedVisuals="1";selectedGroup.className="lmg-visual-group";selectedGroup.innerHTML='<div class="lmg-visual-group-heading"><h3>Selected Images</h3><span>Approved or assigned campaign visuals</span></div><div class="lmg-visual-selected-grid"></div>';originalGrid.insertAdjacentElement("beforebegin",selectedGroup);}
        if(!availableGroup){availableGroup=document.createElement("section");availableGroup.dataset.lmgAvailableVisuals="1";availableGroup.className="lmg-visual-group";availableGroup.innerHTML='<div class="lmg-visual-group-heading"><h3>Available Images</h3><span>Unselected source and AI-generated visuals</span></div><div class="lmg-visual-available-grid"></div>';originalGrid.insertAdjacentElement("beforebegin",availableGroup);}
        const selectedGrid=selectedGroup.querySelector<HTMLElement>(".lmg-visual-selected-grid")!;
        const availableGrid=availableGroup.querySelector<HTMLElement>(".lmg-visual-available-grid")!;

        const selectedLabels=new Set<string>();
        const approval=document.querySelector<HTMLElement>("#creative-approval");
        if(approval)for(const select of Array.from(approval.querySelectorAll<HTMLSelectElement>("select"))){const text=select.selectedOptions[0]?.textContent?.trim();if(text&&text!=="Choose visual")selectedLabels.add(cleanOptionLabel(text));}

        const cards=Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"));
        const bestByImage=new Map<string,{card:HTMLElement;score:number}>();
        const duplicateCards=new Set<HTMLElement>();
        const scoreFor=(card:HTMLElement)=>{const status=card.querySelector(".creative-version")?.textContent?.trim().toUpperCase()??"";const label=card.querySelector("h3")?.textContent?.trim()??"";const selected=status.includes("APPROVED")||selectedLabels.has(label);const ai=(card.querySelector(".eyebrow")?.textContent??"").toLowerCase().includes("ai visual");return(selected?100:0)+(status.includes("RECOMMENDED")?20:0)+(ai?5:0);};

        for(const card of cards){
          card.classList.remove("lmg-visual-thumbnail","lmg-visual-selected","lmg-visual-brief","lmg-visual-duplicate");card.removeAttribute("aria-hidden");
          const label=card.querySelector("h3")?.textContent?.trim()??"";
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const ai=(card.querySelector(".eyebrow")?.textContent??"").toLowerCase().includes("ai visual");
          if(ai){
            const existingBrief=card.querySelector<HTMLElement>(".creative-preview p")?.textContent?.trim();
            if(existingBrief)card.dataset.lmgImageBrief=existingBrief;
            if(!card.dataset.lmgImageBrief)card.dataset.lmgImageBrief=fallbackBrief(label);
            if(img?.src&&!card.querySelector(".creative-preview p[data-lmg-preserved-brief='1']")){
              const p=document.createElement("p");p.dataset.lmgPreservedBrief="1";p.textContent=card.dataset.lmgImageBrief;p.style.display="none";card.querySelector(".creative-preview")?.appendChild(p);
            }
            const approveButton=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve for Campaign|Approved/i.test(b.textContent??""));
            if(!img?.src)approveButton?.remove();
          }
          if(!img?.src)continue;
          const key=normalizeUrl(img.currentSrc||img.src),score=scoreFor(card),existing=bestByImage.get(key);
          if(!existing)bestByImage.set(key,{card,score});else if(score>existing.score){duplicateCards.add(existing.card);bestByImage.set(key,{card,score});}else duplicateCards.add(card);
        }

        let selectedCount=0,thumbnailCount=0;
        for(const card of cards){
          if(duplicateCards.has(card)){card.classList.add("lmg-visual-duplicate");card.setAttribute("aria-hidden","true");originalGrid.appendChild(card);continue;}
          const status=card.querySelector(".creative-version")?.textContent?.trim().toUpperCase()??"";
          const label=card.querySelector("h3")?.textContent?.trim()??"";
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const selected=status.includes("APPROVED")||selectedLabels.has(label);
          if(selected){card.classList.add("lmg-visual-selected");selectedGrid.appendChild(card);selectedCount++;}
          else{if(img?.src){card.classList.add("lmg-visual-thumbnail");img.loading="lazy";thumbnailCount++;}else card.classList.add("lmg-visual-brief");availableGrid.appendChild(card);}
        }
        selectedGroup.style.display=selectedCount?"":"none";
        availableGroup.style.display=cards.length-duplicateCards.size-selectedCount?"":"none";
        originalGrid.style.display="none";

        let summary=section.querySelector<HTMLElement>("[data-lmg-available-visuals-heading='1']");
        if(!summary){summary=document.createElement("p");summary.dataset.lmgAvailableVisualsHeading="1";summary.className="lmg-visual-library-summary";selectedGroup.insertAdjacentElement("beforebegin",summary);}
        const duplicates=duplicateCards.size;
        summary.textContent=`${selectedCount} selected full-size · ${thumbnailCount} available thumbnails${duplicates?` · ${duplicates} duplicate${duplicates===1?"":"s"} hidden`:""}. AI-generated images are added automatically.`;
      });
    };
    organize();
    const observer=new MutationObserver(organize);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","srcset","class","value"]});
    document.addEventListener("change",organize,true);document.addEventListener("click",organize,true);
    return()=>{observer.disconnect();document.removeEventListener("change",organize,true);document.removeEventListener("click",organize,true);cancelAnimationFrame(frame);};
  },[]);
  return null;
}
