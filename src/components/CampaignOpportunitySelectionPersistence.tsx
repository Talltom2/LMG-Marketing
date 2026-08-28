"use client";

import {useEffect} from "react";
import {opportunityCatalog} from "@/app/campaigns/opportunities";

const PREFIX="lmg-opportunity-selections-v1:";
const assetToChannel:Record<string,string>={
  "Website Homepage":"WEBSITE_HOMEPAGE","WooCommerce Store":"WOOCOMMERCE","Pinterest":"PINTEREST","TikTok":"TIKTOK","Facebook / Instagram":"META","Bing / Microsoft Ads":"BING","Walmart Marketplace":"WALMART_MARKETPLACE","Walmart Connect Ads":"WALMART_ADS","Amazon US Marketplace":"AMAZON_US","Amazon Ads":"AMAZON_ADS","Amazon Canada Marketplace":"AMAZON_CA","Email":"EMAIL"
};

function text(el:Element|null){return el?.textContent?.trim()??""}
function cleanLabel(value:string){return value.replace(/Paid$/i,"").trim()}
function activeCampaignId(){try{return localStorage.getItem("lmg-active-campaign-id")||""}catch{return""}}
function key(){const id=activeCampaignId();return id?`${PREFIX}${id}`:""}
function read(){const k=key();if(!k)return{} as Record<string,string[]>;try{return JSON.parse(localStorage.getItem(k)||"{}") as Record<string,string[]>}catch{return{}}}
function write(value:Record<string,string[]>){const k=key();if(!k)return;try{localStorage.setItem(k,JSON.stringify(value))}catch{}}
function opportunityId(channel:string,label:string){return (opportunityCatalog[channel]??[]).find(o=>o.label===label)?.id}

export default function CampaignOpportunitySelectionPersistence(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;

    const restore=()=>{
      const saved=read();
      if(!Object.keys(saved).length)return;
      document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
        const asset=text(card.querySelector(".asset-select strong"));
        const channel=assetToChannel[asset];
        if(!channel||!Object.prototype.hasOwnProperty.call(saved,channel))return;
        const wanted=new Set(saved[channel]);
        card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(option=>{
          const label=cleanLabel(text(option.querySelector("strong")));
          const id=opportunityId(channel,label);
          const box=option.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if(!id||!box)return;
          const should=wanted.has(id);
          if(box.checked!==should)box.click();
        });
      });
    };

    const capture=(event:MouseEvent)=>{
      const box=(event.target as HTMLElement|null)?.closest<HTMLInputElement>('.opportunity-option input[type="checkbox"]');
      if(!box)return;
      const option=box.closest<HTMLElement>(".opportunity-option");
      const card=box.closest<HTMLElement>(".opportunity-channel-card");
      if(!option||!card)return;
      const asset=text(card.querySelector(".asset-select strong"));
      const channel=assetToChannel[asset];
      const label=cleanLabel(text(option.querySelector("strong")));
      const id=channel?opportunityId(channel,label):undefined;
      if(!channel||!id||!activeCampaignId())return;

      const saved=read();
      const current=new Set(saved[channel]??Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option")).filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(o=>opportunityId(channel,cleanLabel(text(o.querySelector("strong"))))).filter(Boolean) as string[]);
      const nextChecked=!box.checked;
      if(nextChecked)current.add(id);else current.delete(id);
      saved[channel]=Array.from(current);
      write(saved);
    };

    document.addEventListener("click",capture,true);
    let tries=0;
    const wait=()=>{if(document.querySelector("#channels .opportunity-channel-card")){restore();return}if(++tries<80)setTimeout(wait,100)};
    wait();
    return()=>document.removeEventListener("click",capture,true);
  },[]);
  return null;
}
