"use client";

import {useEffect} from "react";

const SCHEDULED_KEY="lmg-campaign-scheduled-opportunities-v1";
type ScheduleMap=Record<string,{queuedAt:string;channel:string;opportunity:string}>;

function readScheduled():ScheduleMap{try{return JSON.parse(localStorage.getItem(SCHEDULED_KEY)??"{}") as ScheduleMap;}catch{return{};}}

export default function CampaignOpportunityApprovalGuard(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;

    const campaignName=()=>document.querySelector<HTMLElement>(".campaign-name-title")?.textContent?.trim()||"campaign";
    const opportunityKey=(card:HTMLElement)=>`${campaignName()}::${card.querySelector(".eyebrow")?.textContent?.trim()??""}::${card.querySelector("h3")?.textContent?.trim()??""}`;

    const enhanceCard=(card:HTMLElement)=>{
      const version=card.querySelector<HTMLElement>(".creative-version");
      const status=version?.textContent??"";
      const select=card.querySelector<HTMLSelectElement>("select");
      const approvalButton=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve Visual \+ Copy/.test(b.textContent??""));
      const budget=card.querySelector<HTMLInputElement>(".budget-input input");
      const hasVisual=!!select?.value;
      const paid=!!budget;
      const hasBudget=!paid||Number(budget?.value||0)>0;

      if(approvalButton&&status.includes("REVIEW")&&hasVisual&&hasBudget){
        approvalButton.disabled=false;
        approvalButton.title="Approve this opportunity only";
      }

      const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"";
      const opportunity=card.querySelector("h3")?.textContent?.trim()??"";
      if(channel==="Website Homepage"&&/Homepage Hero Feature/i.test(opportunity)&&!card.querySelector("[data-lmg-hero-spec='1']")){
        const format=card.querySelector<HTMLElement>(".creative-spec");
        const spec=document.createElement("p");
        spec.dataset.lmgHeroSpec="1";
        spec.className="creative-spec lmg-hero-production-spec";
        spec.innerHTML="<strong>LMG hero working master:</strong> 1920 × 800 px desktop canvas (2.4:1), responsive cover. Keep the product, headline and CTA inside the center-safe area because Kadence will crop differently on tablet and mobile.";
        format?.insertAdjacentElement("afterend",spec);
      }

      const head=card.querySelector<HTMLElement>(".creative-card-head");
      if(!head)return;
      let flag=head.querySelector<HTMLElement>("[data-lmg-workflow-flag='1']");
      const scheduled=!!readScheduled()[opportunityKey(card)];
      let text="";
      let kind="";
      if(scheduled){text="✓ SCHEDULED — SKIP";kind="scheduled";}
      else if(status.includes("APPROVED")){text="✓ APPROVED — READY TO SCHEDULE";kind="approved";}
      else if(status.includes("EXCLUDED")){text="EXCLUDED — SKIP";kind="excluded";}
      if(!text){flag?.remove();return;}
      if(!flag){flag=document.createElement("span");flag.dataset.lmgWorkflowFlag="1";flag.className="lmg-opportunity-workflow-flag";head.appendChild(flag);}
      flag.dataset.kind=kind;
      if(flag.textContent!==text)flag.textContent=text;
    };

    const enhance=()=>{
      const section=document.querySelector<HTMLElement>("#creative-approval");
      if(!section)return false;
      for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card")))enhanceCard(card);
      return true;
    };

    requestAnimationFrame(enhance);
    let observer:MutationObserver|null=null;
    if(!document.querySelector("#creative-approval")){
      observer=new MutationObserver(()=>{if(enhance()){observer?.disconnect();observer=null;}});
      observer.observe(document.querySelector("main")??document.body,{childList:true,subtree:true});
    }
    const onInteraction=()=>requestAnimationFrame(enhance);
    document.addEventListener("click",onInteraction,true);
    document.addEventListener("change",onInteraction,true);
    document.addEventListener("input",onInteraction,true);
    return()=>{observer?.disconnect();document.removeEventListener("click",onInteraction,true);document.removeEventListener("change",onInteraction,true);document.removeEventListener("input",onInteraction,true);};
  },[]);
  return null;
}
