"use client";

import {useEffect} from "react";

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

export default function CampaignCalendarWindowGuard(){
  useEffect(()=>{
    if(window.location.pathname!=="/campaigns")return;

    const clampCalendar=()=>{
      const dateInputs=Array.from(document.querySelectorAll<HTMLInputElement>('.campaign-details-grid input[type="date"]'));
      if(dateInputs.length<2)return;
      const start=dateInputs[0]?.value;
      const end=dateInputs[1]?.value;
      if(!start||!end||!ISO_DATE.test(start)||!ISO_DATE.test(end))return;
      const low=start<=end?start:end;
      const high=start<=end?end:start;

      document.querySelectorAll<HTMLElement>('.opportunity-calendar p strong').forEach(node=>{
        const raw=(node.dataset.originalDate||node.textContent||"").trim();
        if(!ISO_DATE.test(raw))return;
        if(!node.dataset.originalDate)node.dataset.originalDate=raw;
        const bounded=raw<low?low:raw>high?high:raw;
        node.textContent=bounded;
        const row=node.closest<HTMLElement>('p');
        if(row){
          if(bounded!==raw){
            row.dataset.windowAdjusted="true";
            row.title=`Recommended timing adjusted from ${raw} to remain inside campaign dates ${low}–${high}.`;
          }else{
            delete row.dataset.windowAdjusted;
            row.removeAttribute('title');
          }
        }
      });
    };

    const resetOriginalDates=()=>{
      document.querySelectorAll<HTMLElement>('.opportunity-calendar p strong').forEach(node=>{
        if(node.dataset.originalDate){
          node.textContent=node.dataset.originalDate;
          delete node.dataset.originalDate;
        }
      });
      clampCalendar();
    };

    const onInput=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(target?.matches('.campaign-details-grid input[type="date"]'))clampCalendar();
    };
    document.addEventListener('input',onInput,true);
    document.addEventListener('change',onInput,true);

    const observer=new MutationObserver(mutations=>{
      const calendarChanged=mutations.some(m=>Array.from(m.addedNodes).some(n=>n instanceof HTMLElement&&(n.matches?.('.opportunity-calendar, .opportunity-calendar *')||n.querySelector?.('.opportunity-calendar'))));
      if(calendarChanged)requestAnimationFrame(resetOriginalDates);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    requestAnimationFrame(clampCalendar);

    return()=>{
      document.removeEventListener('input',onInput,true);
      document.removeEventListener('change',onInput,true);
      observer.disconnect();
    };
  },[]);
  return null;
}
