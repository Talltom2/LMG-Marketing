"use client";

import {useEffect} from "react";

export default function PromotionalAssetsNavInjector(){
  useEffect(()=>{
    const nav=document.querySelector(".lmg-navlinks");
    if(!nav||nav.querySelector('a[href="/promotional-assets"]'))return;
    const link=document.createElement("a");
    link.href="/promotional-assets";
    link.textContent="Promotional Assets";
    const campaignBuilder=nav.querySelector('a[href="/campaigns"]');
    if(campaignBuilder?.nextSibling)nav.insertBefore(link,campaignBuilder.nextSibling);
    else nav.appendChild(link);
  },[]);
  return null;
}
