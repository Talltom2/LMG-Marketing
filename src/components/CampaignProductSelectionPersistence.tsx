"use client";

import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const PREFIX="lmg-product-selections-v1:";
const COLLECTION_KEY="lmg-marketing-product-collections-v1";
type Collection={id:string;name:string;skus:string[]};

function activeId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function key(id:string){return `${PREFIX}${id}`}
function read(id:string):string[]{try{return JSON.parse(localStorage.getItem(key(id))??"[]") as string[]}catch{return[]}}
function write(id:string,value:string[]){try{localStorage.setItem(key(id),JSON.stringify(Array.from(new Set(value))))}catch{}}
function collections():Collection[]{try{return JSON.parse(localStorage.getItem(COLLECTION_KEY)??"[]") as Collection[]}catch{return[]}}
function rowSku(row:HTMLElement){return row.querySelector("td:nth-child(2) small")?.textContent?.trim()??""}
function rows(){return Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr"))}

export default function CampaignProductSelectionPersistence(){
  const pathname=usePathname();
  const[id,setId]=useState("");
  const saveTimer=useRef<number|undefined>(undefined);
  const last=useRef("");

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const sync=()=>setId(current=>{const next=activeId();return next===current?current:next});
    sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer);
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns"||!id)return;
    let cancelled=false,tries=0;

    const persist=async(skus:string[])=>{
      const normalized=Array.from(new Set(skus)).sort(),signature=JSON.stringify(normalized);write(id,normalized);if(signature===last.current)return;
      try{const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:{productSkus:normalized}})});if(r.ok)last.current=signature}catch{}
    };

    const restore=async()=>{
      let saved:string[]=[];
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/builder-state`,{cache:"no-store"});if(r.ok){const d=await r.json() as {state?:{productSkus?:string[]};campaign?:{products?:{product:{sku:string}}[]}};saved=Array.isArray(d.state?.productSkus)?d.state!.productSkus!:(d.campaign?.products??[]).map(p=>p.product.sku)}
      }catch{}
      if(cancelled)return;write(id,saved);last.current=JSON.stringify(Array.from(new Set(saved)).sort());
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
        const current=new Set(read(id));
        for(const row of rows()){const sku=rowSku(row),box=row.querySelector<HTMLInputElement>('input[type="checkbox"]');if(!sku||!box)continue;if(box.checked)current.add(sku);else current.delete(sku)}
        void persist(Array.from(current));
      },100);
    };

    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;if(!target)return;
      const productBox=target.closest<HTMLInputElement>('.campaign-table tbody input[type="checkbox"]');
      if(productBox){const row=productBox.closest<HTMLElement>("tr"),sku=row?rowSku(row):"";if(sku){const current=new Set(read(id));const nextChecked=!productBox.checked;if(nextChecked)current.add(sku);else current.delete(sku);void persist(Array.from(current))}return}

      const button=target.closest<HTMLButtonElement>(".collection-row button");if(!button)return;
      const row=button.closest<HTMLElement>(".collection-row"),name=row?.querySelector("strong")?.textContent?.trim()??"";
      const collection=collections().find(c=>c.name===name);if(!collection)return;
      const label=button.textContent?.trim()??"";
      if(label==="Promote"||label==="Edit")void persist(collection.skus);
      else if(label==="Add")void persist(Array.from(new Set([...read(id),...collection.skus])));
      window.setTimeout(scheduleVisibleScan,50);
    };

    document.addEventListener("click",onClick,true);
    document.addEventListener("change",scheduleVisibleScan,true);
    return()=>{cancelled=true;if(saveTimer.current)window.clearTimeout(saveTimer.current);document.removeEventListener("click",onClick,true);document.removeEventListener("change",scheduleVisibleScan,true)};
  },[pathname,id]);

  return null;
}
