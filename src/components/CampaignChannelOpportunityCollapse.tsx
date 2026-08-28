"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-channel-opportunity-collapse-v1";
type SavedState=Record<string,boolean>;

function readState():SavedState{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)??"{}") as SavedState}catch{return{}}}
function writeState(value:SavedState){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}catch{}}
function campaignKey(){
 const label=Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
 return (label?.querySelector<HTMLInputElement>("input")?.value.trim()||"builder-draft").toLowerCase();
}
function channelKey(card:HTMLElement){
 const name=card.querySelector<HTMLElement>(".asset-select strong")?.textContent?.trim()||"channel";
 return `${campaignKey()}::${name}`.toLowerCase();
}
function styleButton(button:HTMLButtonElement){
 Object.assign(button.style,{
  position:"absolute",right:"16px",top:"14px",width:"28px",height:"28px",minWidth:"28px",padding:"0",border:"0",background:"transparent",color:"#334155",fontSize:"22px",fontWeight:"700",lineHeight:"1",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderRadius:"999px",zIndex:"20"
 });
}
function apply(card:HTMLElement,collapsed:boolean){
 const layer=card.querySelector<HTMLElement>(":scope > .opportunity-layer");
 const button=card.querySelector<HTMLButtonElement>(":scope > [data-lmg-channel-collapse='1']");
 if(!layer||!button)return;
 layer.style.display=collapsed?"none":"";
 button.textContent=collapsed?"⌄":"⌃";
 button.setAttribute("aria-expanded",collapsed?"false":"true");
 button.setAttribute("aria-label",collapsed?"Expand opportunities":"Collapse opportunities");
 button.title=collapsed?"Expand opportunities":"Collapse opportunities";
}
function enhance(){
 const saved=readState();
 for(const card of Array.from(document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card"))){
  const layer=card.querySelector<HTMLElement>(":scope > .opportunity-layer");
  if(!layer)continue;
  card.style.position="relative";
  const asset=card.querySelector<HTMLElement>(":scope > .asset-select");
  if(asset)asset.style.paddingRight="46px";
  let button=card.querySelector<HTMLButtonElement>(":scope > [data-lmg-channel-collapse='1']");
  if(!button){
   button=document.createElement("button");
   button.type="button";
   button.dataset.lmgChannelCollapse="1";
   card.appendChild(button);
   button.addEventListener("click",event=>{
    event.preventDefault();event.stopPropagation();
    const layerNow=card.querySelector<HTMLElement>(":scope > .opportunity-layer");
    const next=layerNow?.style.display!=="none";
    const all=readState();all[channelKey(card)]=next;writeState(all);apply(card,next);
   });
  }
  styleButton(button);
  apply(card,saved[channelKey(card)]===true);
 }
}

export default function CampaignChannelOpportunityCollapse(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  enhance();
  const timer=window.setInterval(enhance,500);
  const observer=new MutationObserver(enhance);
  observer.observe(document.body,{subtree:true,childList:true});
  return()=>{window.clearInterval(timer);observer.disconnect()};
 },[]);
 return null;
}
