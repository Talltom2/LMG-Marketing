"use client";

import {useEffect} from "react";

export default function CampaignVisualCardCollapse(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;

    const findVisualSection=()=>{
      const headings=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading"));
      const heading=headings.find(item=>item.textContent?.includes("Campaign Visual Library"));
      return heading?.closest<HTMLElement>(".campaign-stage-panel")??null;
    };

    const enhance=()=>{
      const section=findVisualSection();
      if(!section)return false;
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".creative-card-grid > article.creative-card"));
      for(const card of cards){
        if(card.dataset.lmgWholeCardToggle==="1")continue;
        const head=card.querySelector<HTMLElement>(".creative-card-head");
        if(!head)continue;
        card.dataset.lmgWholeCardToggle="1";
        const control=document.createElement("button");
        control.type="button";
        control.className="lmg-card-expand-control";
        control.setAttribute("aria-expanded","true");
        control.textContent="Collapse card";
        control.addEventListener("click",event=>{
          event.preventDefault();
          event.stopPropagation();
          const collapsed=card.classList.toggle("lmg-card-collapsed");
          control.setAttribute("aria-expanded",collapsed?"false":"true");
          control.textContent=collapsed?"Expand card":"Collapse card";
        });
        head.appendChild(control);
      }
      return true;
    };

    requestAnimationFrame(enhance);
    const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
    observer.observe(document.querySelector("main")??document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
