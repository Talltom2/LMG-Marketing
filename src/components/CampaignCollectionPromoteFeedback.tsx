"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const STORAGE_KEY="lmg-marketing-product-collections-v1";

type ProductCollection={id:string;name:string;skus:string[]};

export default function CampaignCollectionPromoteFeedback(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns")return;

    function onClick(event:MouseEvent){
      const target=event.target as HTMLElement|null;
      const button=target?.closest("button");
      if(!button||button.textContent?.trim()!=="Promote")return;
      const row=button.closest(".collection-row");
      const name=row?.querySelector("strong")?.textContent?.trim();
      if(!name)return;

      let count=0;
      try{
        const collections=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]") as ProductCollection[];
        count=collections.find(c=>c.name===name)?.skus.length??0;
      }catch{}

      const search=document.querySelector<HTMLInputElement>('input[type="search"]');
      if(search&&search.value){
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
        setter?.call(search,"");
        search.dispatchEvent(new Event("input",{bubbles:true}));
      }

      window.setTimeout(()=>{
        document.getElementById("collection-promote-toast")?.remove();
        const toast=document.createElement("div");
        toast.id="collection-promote-toast";
        toast.setAttribute("role","status");
        toast.textContent=count?`${name} loaded — ${count} product${count===1?"":"s"} selected for this campaign.`:`${name} loaded into this campaign.`;
        Object.assign(toast.style,{position:"fixed",right:"24px",bottom:"24px",zIndex:"9999",maxWidth:"420px",padding:"14px 18px",borderRadius:"12px",background:"#173c1c",color:"white",fontWeight:"800",boxShadow:"0 10px 30px rgba(0,0,0,.22)"});
        document.body.appendChild(toast);
        window.setTimeout(()=>toast.remove(),4500);

        const step3=[...document.querySelectorAll("h2")].find(el=>el.textContent?.trim().startsWith("3 ·"));
        step3?.scrollIntoView({behavior:"smooth",block:"start"});
      },80);
    }

    document.addEventListener("click",onClick,true);
    return()=>document.removeEventListener("click",onClick,true);
  },[pathname]);

  return null;
}
