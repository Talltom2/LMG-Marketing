"use client";
import {useEffect} from "react";

const SCHEDULED_KEY="lmg-campaign-scheduled-opportunities-v1";
type Item={status?:string;channel?:string;opportunity?:string;startDate?:string;endDate?:string;destinationUrl?:string;slot?:string;serverReservationId?:string};
type MapT=Record<string,Item>;
function read():MapT{try{return JSON.parse(localStorage.getItem(SCHEDULED_KEY)||"{}") as MapT}catch{return{}}}
function write(v:MapT){try{localStorage.setItem(SCHEDULED_KEY,JSON.stringify(v))}catch{}}
function txt(el:Element|null){return el?.textContent?.trim()||""}

export default function HomepageScheduleServerSync(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  let running=false;
  const sync=async()=>{
   if(running)return;running=true;
   try{
    const rows=Array.from(document.querySelectorAll<HTMLElement>("[data-lmg-step8='1'] .lmg-schedule-item"));
    for(const row of rows){
     const key=row.dataset.scheduleKey||"";if(!key)continue;
     const map=read(),item=map[key];if(!item||item.serverReservationId||item.status!=="SCHEDULED")continue;
     if(item.channel!=="Website Homepage"||!/Homepage Hero Feature/i.test(item.opportunity||""))continue;
     const status=row.querySelector<HTMLElement>("[data-schedule-status]");
     const cards=Array.from(document.querySelectorAll<HTMLElement>("#creative-approval article.creative-card"));
     const card=cards.find(c=>txt(c.querySelector(".eyebrow"))===item.channel&&txt(c.querySelector("h3"))===item.opportunity);
     if(!card){if(status)status.textContent="Server preflight waiting for the approved creative card.";continue;}
     const campaignName=txt(document.querySelector(".campaign-name-title"));
     const start=row.querySelector<HTMLInputElement>("[data-schedule-start]")?.value||item.startDate||"";
     const end=row.querySelector<HTMLInputElement>("[data-schedule-end]")?.value||item.endDate||"";
     const destinationUrl=row.querySelector<HTMLInputElement>("[data-schedule-url]")?.value.trim()||item.destinationUrl||"";
     const inputs=Array.from(card.querySelectorAll<HTMLInputElement>(".creative-copy-edit input"));
     const headline=inputs.find(i=>i.closest("label")?.textContent?.trim().startsWith("Headline"))?.value||"";
     const cta=inputs.find(i=>i.closest("label")?.textContent?.trim().startsWith("CTA"))?.value||"";
     const body=card.querySelector<HTMLTextAreaElement>(".creative-copy-edit textarea")?.value||"";
     const imageUrl=card.querySelector<HTMLImageElement>(".lmg-live-creative-preview img, .creative-preview img")?.src||"";
     if(!campaignName||!headline||!cta||!destinationUrl||!imageUrl){if(status)status.textContent="Server preflight needs campaign name, approved image, headline, CTA and product URL.";continue;}
     if(status)status.textContent="Confirming server reservation…";
     try{
      const r=await fetch("/api/website/homepage/schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignName,opportunityId:"hero",headline,body,cta,destinationUrl,imageUrl,startAt:`${start}T00:00:00`,endAt:`${end}T23:59:59`})});
      const d=await r.json();if(!r.ok)throw new Error(d.conflict?`Conflict with ${d.conflict.campaign} (${String(d.conflict.startAt).slice(0,10)}–${String(d.conflict.endAt).slice(0,10)}).`:d.error||"Server scheduling failed");
      const latest=read();if(latest[key]){latest[key]={...latest[key],serverReservationId:String(d.reservation?.id||"confirmed")};write(latest)}
      row.dataset.serverSynced="1";if(status)status.textContent="✓ Server reservation confirmed. WordPress publication is armed for this window.";
     }catch(e){const latest=read();if(latest[key]){latest[key]={...latest[key],status:"QUEUED"};write(latest)}row.dataset.scheduleState="error";if(status)status.textContent=e instanceof Error?e.message:"Server scheduling failed";}
    }
   }finally{running=false}
  };
  const observer=new MutationObserver(()=>void sync());observer.observe(document.body,{childList:true,subtree:true});
  const timer=window.setInterval(()=>void sync(),2500);void sync();
  return()=>{observer.disconnect();window.clearInterval(timer)};
 },[]);
 return null;
}
