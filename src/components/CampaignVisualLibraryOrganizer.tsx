"use client";

import {useEffect} from "react";

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function stage5A(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="5A")??null}
function normalizeUrl(value:string){
  try{
    const u=new URL(value,location.origin);u.hash="";u.search="";u.protocol="https:";u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    u.pathname=decodeURIComponent(u.pathname).replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i,"").replace(/-scaled(?=\.[a-z0-9]+$)/i,"").replace(/\/{2,}/g,"/").replace(/\/$/,"");
    return `${u.hostname}${u.pathname}`.toLowerCase();
  }catch{return value.trim().toLowerCase().replace(/[?#].*$/,"")}
}

export default function CampaignVisualLibraryOrganizer(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    let frame=0,timer=0;

    const organize=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const section=stage5A();if(!section)return;
        const grid=section.querySelector<HTMLElement>(".creative-card-grid");if(!grid)return;
        section.dataset.lmgVisualLibraryOrganized="1";
        grid.classList.add("lmg-visual-library-source-grid");

        const cards=Array.from(grid.querySelectorAll<HTMLElement>(":scope > article.creative-card"));
        const bestByImage=new Map<string,{card:HTMLElement;score:number}>();
        const duplicates=new Set<HTMLElement>();

        for(const card of cards){
          const status=text(card.querySelector(".creative-version")).toUpperCase();
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const ai=/AI visual/i.test(text(card.querySelector(".eyebrow")));
          const approve=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve for Campaign|✓ Approved|Saved to Campaign/i.test(text(b)));
          if(ai&&approve&&!status.includes("APPROVED")){
            approve.disabled=!img?.src;
            if(!img?.src)approve.title="Generate the image before selecting it for the campaign";else approve.removeAttribute("title");
          }
          if(!img?.src)continue;
          const key=normalizeUrl(img.currentSrc||img.src);
          const score=(status.includes("APPROVED")?100:0)+(status.includes("RECOMMENDED")?20:0)+(ai?5:0);
          const existing=bestByImage.get(key);
          if(!existing)bestByImage.set(key,{card,score});
          else if(score>existing.score){duplicates.add(existing.card);bestByImage.set(key,{card,score})}
          else duplicates.add(card);
        }

        for(const card of cards){
          const status=text(card.querySelector(".creative-version")).toUpperCase();
          const img=card.querySelector<HTMLImageElement>(".creative-preview img");
          const next=duplicates.has(card)?"lmg-visual-duplicate":status.includes("APPROVED")?"lmg-visual-selected":img?.src?"lmg-visual-thumbnail":"lmg-visual-brief";
          for(const cls of ["lmg-visual-duplicate","lmg-visual-selected","lmg-visual-thumbnail","lmg-visual-brief"])if(cls!==next&&card.classList.contains(cls))card.classList.remove(cls);
          if(!card.classList.contains(next))card.classList.add(next);
          if(duplicates.has(card))card.setAttribute("aria-hidden","true");else card.removeAttribute("aria-hidden");
        }
      });
    };

    const schedule=()=>{window.setTimeout(organize,40)};
    organize();
    timer=window.setInterval(organize,500);
    window.setTimeout(()=>window.clearInterval(timer),10000);
    document.addEventListener("click",schedule,true);
    document.addEventListener("change",schedule,true);
    document.addEventListener("lmg-builder-state-changed",schedule as EventListener,true);
    return()=>{window.clearInterval(timer);cancelAnimationFrame(frame);document.removeEventListener("click",schedule,true);document.removeEventListener("change",schedule,true);document.removeEventListener("lmg-builder-state-changed",schedule as EventListener,true)};
  },[]);
  return null;
}
