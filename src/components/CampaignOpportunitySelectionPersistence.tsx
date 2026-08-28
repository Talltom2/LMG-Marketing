"use client";

import {useEffect,useRef,useState} from "react";
import {opportunityCatalog,recommendedOpportunityIdsFor} from "@/app/campaigns/opportunities";
import {campaignTemplates} from "@/app/campaigns/templates";

const ACTIVE_KEY="lmg-active-campaign-id";
const PREFIX="lmg-opportunity-selections-v1:";
const DRAFT_ID="builder-draft";
const assetToChannel:Record<string,string>={"Website Homepage":"WEBSITE_HOMEPAGE","WooCommerce Store":"WOOCOMMERCE","Pinterest":"PINTEREST","TikTok":"TIKTOK","Facebook / Instagram":"META","Bing / Microsoft Ads":"BING","Walmart Marketplace":"WALMART_MARKETPLACE","Walmart Connect Ads":"WALMART_ADS","Amazon US Marketplace":"AMAZON_US","Amazon Ads":"AMAZON_ADS","Amazon Canada Marketplace":"AMAZON_CA","Email":"EMAIL"};

function text(el:Element|null){return el?.textContent?.trim()??""}
function cleanLabel(value:string){return value.replace(/Paid$/i,"").trim()}
function activeId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function contextId(){return activeId()||DRAFT_ID}
function key(id:string){return `${PREFIX}${id}`}
function read(id:string){try{return JSON.parse(localStorage.getItem(key(id))??"{}") as Record<string,string[]>}catch{return{}}}
function write(id:string,value:Record<string,string[]>){try{localStorage.setItem(key(id),JSON.stringify(value))}catch{}}
function opportunityId(channel:string,label:string){return (opportunityCatalog[channel]??[]).find(o=>o.label===label)?.id}
function labelsFor(value:Record<string,string[]>){return Object.fromEntries(Object.entries(value).map(([channel,ids])=>[channel,ids.map(id=>(opportunityCatalog[channel]??[]).find(o=>o.id===id)?.label).filter(Boolean) as string[]]))}
function currentTemplateId(){const name=text(document.querySelector<HTMLElement>(".template-card.selected strong"));return campaignTemplates.find(t=>t.name===name)?.id??"EVERGREEN_SPOTLIGHT"}
function visibleIds(card:HTMLElement,channel:string){return Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option")).filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(o=>opportunityId(channel,cleanLabel(text(o.querySelector("strong"))))).filter(Boolean) as string[]}

export default function CampaignOpportunitySelectionPersistence(){
  const[ctx,setCtx]=useState(DRAFT_ID);
  const restoring=useRef(false),interacted=useRef(false),last=useRef("");

  useEffect(()=>{if(location.pathname!=="/campaigns")return;const sync=()=>setCtx(current=>{const next=contextId();return next===current?current:next});sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer)},[]);

  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    const campaignId=ctx===DRAFT_ID?"":ctx;let cancelled=false;last.current="";interacted.current=false;

    const persist=async(value:Record<string,string[]>)=>{
      const normalized=Object.fromEntries(Object.entries(value).map(([channel,ids])=>[channel,Array.from(new Set(ids)).sort()]));
      // Write browser state immediately. Any later restore pass now sees the user's
      // newest check/uncheck choice instead of re-applying the previous value.
      write(ctx,normalized);const signature=JSON.stringify(normalized);if(signature===last.current)return;
      if(!campaignId){last.current=signature;return}
      try{const r=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:{opportunities:normalized,opportunityLabels:labelsFor(normalized)}})});if(r.ok)last.current=signature}catch{}
    };

    const apply=(saved:Record<string,string[]>)=>{restoring.current=true;try{document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{const asset=text(card.querySelector(".asset-select strong")),channel=assetToChannel[asset];if(!channel||!Object.prototype.hasOwnProperty.call(saved,channel))return;const wanted=new Set(saved[channel]);card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(option=>{const oid=opportunityId(channel,cleanLabel(text(option.querySelector("strong")))),box=option.querySelector<HTMLInputElement>('input[type="checkbox"]');if(oid&&box&&box.checked!==wanted.has(oid))box.click()})})}finally{restoring.current=false}};

    const restore=async()=>{
      let saved=read(ctx);
      if(campaignId){try{const r=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/builder-state`,{cache:"no-store"});if(r.ok){const d=await r.json() as {state?:{opportunities?:Record<string,string[]>;opportunityLabels?:Record<string,string[]>}};if(d.state?.opportunities&&typeof d.state.opportunities==="object")saved=d.state.opportunities;else if(d.state?.opportunityLabels)saved=Object.fromEntries(Object.entries(d.state.opportunityLabels).map(([channel,labels])=>[channel,labels.map(label=>opportunityId(channel,label)).filter(Boolean) as string[]]))}}catch{}}
      if(cancelled||interacted.current)return;write(ctx,saved);last.current=JSON.stringify(Object.fromEntries(Object.entries(saved).map(([channel,ids])=>[channel,Array.from(new Set(ids)).sort()])));apply(saved);
    };
    void restore();

    const onClick=(event:MouseEvent)=>{
      if(restoring.current)return;
      const target=event.target as HTMLElement|null;if(!target)return;

      const template=target.closest<HTMLElement>(".template-card");
      if(template){const name=text(template.querySelector("strong")),t=campaignTemplates.find(x=>x.name===name);if(t){interacted.current=true;const next=Object.fromEntries(t.recommendedAssets.map(channel=>[channel,recommendedOpportunityIdsFor(channel,t.id)]));void persist(next)}return}

      const card=target.closest<HTMLElement>("#channels .opportunity-channel-card");if(!card)return;
      const asset=text(card.querySelector(".asset-select strong")),channel=assetToChannel[asset];if(!channel)return;

      const reset=target.closest<HTMLButtonElement>(".button-muted");
      if(reset&&/AI recommendations/i.test(text(reset))){interacted.current=true;const current={...read(ctx),[channel]:recommendedOpportunityIdsFor(channel,currentTemplateId())};void persist(current);return}

      const opportunityBox=target.closest<HTMLInputElement>('.opportunity-option input[type="checkbox"]');
      if(opportunityBox){
        const option=opportunityBox.closest<HTMLElement>(".opportunity-option"),oid=option?opportunityId(channel,cleanLabel(text(option.querySelector("strong")))):undefined;if(!oid)return;
        interacted.current=true;
        const current={...read(ctx)};
        if(!Object.prototype.hasOwnProperty.call(current,channel))current[channel]=visibleIds(card,channel);
        const ids=new Set(current[channel]??[]),nextChecked=!opportunityBox.checked;
        if(nextChecked)ids.add(oid);else ids.delete(oid);
        current[channel]=Array.from(ids);
        void persist(current);
        return;
      }

      const assetBox=target.closest<HTMLInputElement>('.asset-select input[type="checkbox"]');
      if(assetBox){
        interacted.current=true;
        const current={...read(ctx)},nextActive=!assetBox.checked;
        if(nextActive)current[channel]=recommendedOpportunityIdsFor(channel,currentTemplateId());else delete current[channel];
        void persist(current);
      }
    };

    // The interval only restores cards that re-enter the DOM after a collapse/
    // expand. It never owns the user's click; local storage is updated first.
    const keepVisibleInSync=()=>{if(!restoring.current)apply(read(ctx))};
    document.addEventListener("click",onClick,true);
    const interval=window.setInterval(keepVisibleInSync,800);
    return()=>{cancelled=true;window.clearInterval(interval);document.removeEventListener("click",onClick,true)};
  },[ctx]);
  return null;
}
