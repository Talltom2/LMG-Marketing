"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const COLLECTION_STORAGE_KEY="lmg-marketing-product-collections-v1";
type ProductCollection={id:string;name:string;skus:string[]};

function selectedSkus(){
  return new Set(Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(row=>row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(row=>row.querySelector("td:nth-child(2) small")?.textContent?.trim()||"").filter(Boolean));
}

function collections():ProductCollection[]{
  try{return JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY)||"[]") as ProductCollection[]}catch{return[]}
}

function applyHighlights(){
  const selected=selectedSkus();
  document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr").forEach(row=>{
    const checked=row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked;
    row.classList.toggle("campaign-product-selected",!!checked);
  });
  const byName=new Map(collections().map(c=>[c.name,c]));
  document.querySelectorAll<HTMLElement>(".collection-row").forEach(row=>{
    const name=row.querySelector("strong")?.textContent?.trim()||"";
    const collection=byName.get(name);
    const included=!!collection?.skus.length&&collection.skus.every(sku=>selected.has(sku));
    row.classList.toggle("campaign-collection-selected",included);
  });
}

export default function CampaignSelectionHighlighter(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let timer:number|undefined;
    const schedule=()=>{window.clearTimeout(timer);timer=window.setTimeout(applyHighlights,30)};
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["checked"]});
    document.addEventListener("change",schedule,true);
    document.addEventListener("click",schedule,true);
    window.addEventListener("storage",schedule);
    schedule();
    return()=>{observer.disconnect();document.removeEventListener("change",schedule,true);document.removeEventListener("click",schedule,true);window.removeEventListener("storage",schedule);window.clearTimeout(timer)};
  },[pathname]);
  return null;
}
