"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";

const STORAGE_KEY="lmg-campaign-card3-collapsed-v1";

export default function CampaignCard3Collapse(){
  const pathname=usePathname();
  const[target,setTarget]=useState<HTMLElement|null>(null);
  const[collapsed,setCollapsed]=useState(false);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{setCollapsed(localStorage.getItem(STORAGE_KEY)==="1")}catch{}

    let cancelled=false;
    let tries=0;
    const find=()=>{
      const card=document.getElementById("channels");
      const heading=card?.querySelector<HTMLElement>(".stage-heading");
      if(card&&heading){
        heading.style.position="relative";
        heading.style.paddingRight="44px";
        if(!cancelled)setTarget(heading);
        return;
      }
      if(++tries<80)window.setTimeout(find,100);
    };
    find();
    return()=>{cancelled=true};
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    const card=document.getElementById("channels");
    if(!card)return;
    Array.from(card.children).forEach(child=>{
      if((child as HTMLElement).classList.contains("stage-heading"))return;
      (child as HTMLElement).style.display=collapsed?"none":"";
    });
    try{localStorage.setItem(STORAGE_KEY,collapsed?"1":"0")}catch{}
  },[pathname,collapsed,target]);

  if(pathname!=="/campaigns"||!target)return null;

  return createPortal(
    <button
      type="button"
      className="lmg-card3-collapse-toggle"
      aria-expanded={!collapsed}
      aria-label={collapsed?"Expand promotional assets, channels and opportunities":"Collapse promotional assets, channels and opportunities"}
      title={collapsed?"Expand Card 3":"Collapse Card 3"}
      onClick={()=>setCollapsed(v=>!v)}
      style={{
        position:"absolute",
        right:4,
        top:"50%",
        transform:"translateY(-50%)",
        width:30,
        height:30,
        minWidth:30,
        padding:0,
        border:0,
        background:"transparent",
        fontSize:22,
        fontWeight:800,
        lineHeight:1,
        cursor:"pointer",
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
        zIndex:10
      }}
    >{collapsed?"⌄":"⌃"}</button>,
    target
  );
}
