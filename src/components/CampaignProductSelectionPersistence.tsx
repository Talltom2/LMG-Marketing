"use client";

import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const PREFIX="lmg-product-selections-v1:";
const DRAFT_ID="builder-draft";
const COLLECTION_KEY="lmg-marketing-product-collections-v1";
type Collection={id:string;name:string;skus:string[]};

function activeId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function contextId(){return activeId()||DRAFT_ID}
function key(id:string){return `${PREFIX}${id}`}
function read(id:string):string[]{try{return JSON.parse(localStorage.getItem(key(id))??"[]") as string[]}catch{return[]}}
function write(id:string,value:string[]){try{localStorage.setItem(key(id),JSON.stringify(Array.from(new Set(value))))}catch{}}
function collections():Collection[]{try{return JSON.parse(localStorage.getItem(COLLECTION_KEY)??"[]") as Collection[]}catch{return[]}}
function rowSku(row:HTMLElement){return row.querySelector("td:nth-child(2) small")?.textContent?.trim()??""}
function rows(){return Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr"))}

export default function CampaignProductSelectionPersistence(){
  const pathname=usePathname();
  const[ctx,setCtx]=useState(DRAFT_ID);
  const saveTimer=useRef<number|undefined>(undefined);
  const last=useRef("");

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const sync=()=>setCtx(current=>{const next=contextId();return next===current?current:next});
    sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer);
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const campaignId=ctx===DRAFT_ID?"":ctx;
    let cancelled=false,tries=0;last.current="";

    const persist=async(skus:string[])=>{
      const normalized=Array.from(new Set(skus)).sort(),signature=JSON.stringify(normalized);write(ctx,normalized);if(signature===last.current)return;
      if(!campaignId){last.current=signature;return}
      try{const r=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:{productSkus:normalized}})});if(r.ok)last.current=signature}catch{}
    };

    const restore=async()=>{
      let saved=read(ctx);
      if(campaignId){
        try{const r=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/builder-state`,{cache:"no-store"});if(r.ok){const d=await r.json() as {state?:{productSkus?:string[]};campaign?:{products?:{product:{sku:string}}[]}};saved=Array.isArray(d.state?.productSkus)?d.state!.productSkus!:(d.campaign?.products??[]).map(p=>p.product.sku)}}catch{}
      }
      if(cancelled)return;write(ctx,saved);last.current=JSON.stringify(Array.from(new Set(saved)).sort());
      const apply=()=>{
        const tableRows=rows();if(!tableRows.length){if(++tries<100)window.setTimeout(apply,100);return}
        const wanted=new Set(saved);
        for(const row of tableRows){const sku=rowSku(row),box=row.querySelector<HTMLInputElement>('input[type="checkbox"]');if(box&&sku&&box.checked!==wanted.has(sku))box.click()}
      };
      apply();
    };
    void restore();

    const scheduleVisibleScan=()=>{
      if(saveTimer.current)window.clearTimeout(saveTimer.current);
      saveTimer.current=window.setTimeout(()=>{
        const current=new Set(read(ctx));
        for(const row of rows()){const sku=rowSku(row),box=row.querySelector<HTMLInputElement>('input[type="checkbox"]');if(!sku||!box)continue;if(box.checked)current.add(sku);else current.delete(sku)}
        void persist(Array.from(current));
      },100);
    };

    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;if(!target)return;
      if(target.closest('.campaign-table tbody input[type="checkbox"]')){scheduleVisibleScan();return}
      const button=target.closest<HTMLButtonElement>(".collection-row button");if(!button)return;
      const row=button.closest<HTMLElement>(".collection-row"),name=row?.querySelector("strong")?.textContent?.trim()??"";
      const collection=collections().find(c=>c.name===name);if(!collection)return;
      const label=button.textContent?.trim()??"";
      if(label==="Promote"||label==="Edit")void persist(collection.skus);
      else if(label==="Add")void persist(Array.from(new Set([...read(ctx),...collection.skus])));
      window.setTimeout(scheduleVisibleScan,50);
    };

    document.addEventListener("click",onClick,true);
    document.addEventListener("change",scheduleVisibleScan,true);
    return()=>{cancelled=true;if(saveTimer.current)window.clearTimeout(saveTimer.current);document.removeEventListener("click",onClick,true);document.removeEventListener("change",scheduleVisibleScan,true)};
  },[pathname,ctx]);

  return null;
}
