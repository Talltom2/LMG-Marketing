"use client";

import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const SCHEDULED_KEY="lmg-campaign-scheduled-opportunities-v1";

type ScheduleItem={queuedAt:string;channel:string;opportunity:string;status?:"QUEUED"|"SCHEDULED";startDate?:string;endDate?:string;destinationUrl?:string;slot?:string};
type ScheduleMap=Record<string,ScheduleItem>;

function readAll():ScheduleMap{try{return JSON.parse(localStorage.getItem(SCHEDULED_KEY)??"{}") as ScheduleMap}catch{return{}}}
function writeAll(value:ScheduleMap){try{localStorage.setItem(SCHEDULED_KEY,JSON.stringify(value))}catch{}}
function activeId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function prefix(id:string){return `campaign:${id}::`}
function forCampaign(id:string){const all=readAll(),out:ScheduleMap={};for(const[key,value]of Object.entries(all))if(key.startsWith(prefix(id)))out[key]=value;return out}

export default function CampaignSchedulePersistence(){
  const pathname=usePathname();
  const timer=useRef<number|undefined>(undefined);
  const last=useRef("");

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const id=activeId();if(!id)return;
    let cancelled=false;

    const restore=async()=>{
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{cache:"no-store"});if(!r.ok)return;
        const d=await r.json() as {state?:{scheduledOpportunities?:ScheduleMap}};
        const saved=d.state?.scheduledOpportunities;if(!saved||typeof saved!=="object")return;
        const all=readAll();
        for(const key of Object.keys(all))if(key.startsWith(prefix(id)))delete all[key];
        Object.assign(all,saved);writeAll(all);last.current=JSON.stringify(saved);
        document.dispatchEvent(new Event("change",{bubbles:true}));
      }catch{}
    };

    const persist=async()=>{
      const current=forCampaign(id),signature=JSON.stringify(current);if(signature===last.current)return;
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:{scheduledOpportunities:current}})});
        if(r.ok)last.current=signature;
      }catch{}
    };

    const schedule=()=>{
      if(timer.current)window.clearTimeout(timer.current);
      timer.current=window.setTimeout(()=>{if(!cancelled)void persist()},350);
    };

    void restore();
    document.addEventListener("click",schedule,true);
    document.addEventListener("change",schedule,true);
    document.addEventListener("input",schedule,true);
    return()=>{cancelled=true;if(timer.current)window.clearTimeout(timer.current);document.removeEventListener("click",schedule,true);document.removeEventListener("change",schedule,true);document.removeEventListener("input",schedule,true)};
  },[pathname]);

  return null;
}
