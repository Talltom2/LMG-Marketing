"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

export default function CampaignWooCommerceDefaults(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns") return;

    const activate=()=>{
      const cards=Array.from(document.querySelectorAll<HTMLElement>(".opportunity-channel-card"));
      const wooCard=cards.find(card=>card.textContent?.includes("WooCommerce Store"));
      if(!wooCard) return;

      const assetCheckbox=wooCard.querySelector<HTMLInputElement>(".asset-select input[type='checkbox']");
      if(assetCheckbox && !assetCheckbox.checked){
        assetCheckbox.click();
        return;
      }

      const opportunityLabels=Array.from(wooCard.querySelectorAll<HTMLLabelElement>(".opportunity-option"));
      const landing=opportunityLabels.find(label=>label.textContent?.includes("Campaign Landing Page"));
      const landingCheckbox=landing?.querySelector<HTMLInputElement>("input[type='checkbox']");
      if(landingCheckbox && !landingCheckbox.checked) landingCheckbox.click();
    };

    activate();
    const observer=new MutationObserver(()=>activate());
    observer.observe(document.body,{childList:true,subtree:true});
    const timer=window.setTimeout(()=>observer.disconnect(),5000);
    return()=>{observer.disconnect();window.clearTimeout(timer)};
  },[pathname]);

  return null;
}
