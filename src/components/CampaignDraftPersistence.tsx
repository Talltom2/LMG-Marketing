"use client";

import {useEffect} from "react";

const KEY="lmg-marketing-campaign-builder-draft-v2";

type Draft={
  name?:string;
  startDate?:string;
  endDate?:string;
  objective?:string;
  templateName?:string;
  productSkus?:string[];
  activeAssets?:string[];
  opportunities?:Record<string,string[]>;
  headline?:string;
  cta?:string;
  coreMessage?:string;
};

function setNativeValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

function text(el:Element|null){return el?.textContent?.trim()??"";}

export default function CampaignDraftPersistence(){
  useEffect(()=>{
    if(location.pathname!=="/campaigns")return;
    let restoring=true;
    let restoreAttempts=0;

    const getStep1=()=>document.querySelector<HTMLElement>(".campaign-details-card");
    const getWorkspace=()=>document.querySelector<HTMLElement>(".campaign-workspace");
    const getChannels=()=>document.querySelector<HTMLElement>("#channels");
    const getMessaging=()=>Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector("h2")).includes("Edit and approve the campaign messaging"));

    const snapshot=():Draft=>{
      const step1=getStep1();
      const step1Inputs=step1?Array.from(step1.querySelectorAll<HTMLInputElement>("input")):[];
      const name=step1Inputs.find(i=>i.type!=="date");
      const dates=step1Inputs.filter(i=>i.type==="date");
      const objective=step1?.querySelector<HTMLTextAreaElement>("textarea");
      const selectedTemplate=step1?.querySelector<HTMLButtonElement>(".template-card.selected strong");

      const productSkus=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr"))
        .filter(r=>r.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
        .map(r=>text(r.querySelector("td:nth-child(2) small")))
        .filter(Boolean);

      const activeAssets:string[]=[];
      const opportunities:Record<string,string[]>={};
      getChannels()?.querySelectorAll<HTMLElement>(".opportunity-channel-card").forEach(card=>{
        const assetLabel=text(card.querySelector(".asset-select strong"));
        const active=!!card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]')?.checked;
        if(!assetLabel||!active)return;
        activeAssets.push(assetLabel);
        opportunities[assetLabel]=Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option"))
          .filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
          .map(o=>text(o.querySelector("strong")).replace(/Paid$/,"" ).trim())
          .filter(Boolean);
      });

      const messaging=getMessaging();
      const mInputs=messaging?Array.from(messaging.querySelectorAll<HTMLInputElement>("input")):[];
      const mTextareas=messaging?Array.from(messaging.querySelectorAll<HTMLTextAreaElement>("textarea")):[];

      return{
        name:name?.value,
        startDate:dates[0]?.value,
        endDate:dates[1]?.value,
        objective:objective?.value,
        templateName:text(selectedTemplate),
        productSkus,
        activeAssets,
        opportunities,
        headline:mInputs[0]?.value,
        cta:mInputs[1]?.value,
        coreMessage:mTextareas[0]?.value,
      };
    };

    const save=()=>{
      if(restoring)return;
      try{localStorage.setItem(KEY,JSON.stringify(snapshot()));}catch{}
    };

    const restore=()=>{
      let d:Draft|undefined;
      try{const raw=localStorage.getItem(KEY);if(raw)d=JSON.parse(raw) as Draft;}catch{}
      if(!d){restoring=false;return true;}

      const step1=getStep1();
      if(!step1)return false;
      const step1Inputs=Array.from(step1.querySelectorAll<HTMLInputElement>("input"));
      const name=step1Inputs.find(i=>i.type!=="date");
      const dates=step1Inputs.filter(i=>i.type==="date");
      const objective=step1.querySelector<HTMLTextAreaElement>("textarea");
      const templateButtons=Array.from(step1.querySelectorAll<HTMLButtonElement>(".template-card"));
      if(d.templateName){
        const btn=templateButtons.find(b=>text(b.querySelector("strong"))===d.templateName);
        if(btn&&!btn.classList.contains("selected"))btn.click();
      }
      if(name&&d.name!=null)setNativeValue(name,d.name);
      if(dates[0]&&d.startDate)setNativeValue(dates[0],d.startDate);
      if(dates[1]&&d.endDate)setNativeValue(dates[1],d.endDate);
      if(objective&&d.objective!=null)setNativeValue(objective,d.objective);

      const rows=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr"));
      const productsReady=!d.productSkus?.length||rows.length>0;
      if(d.productSkus?.length&&rows.length){
        rows.forEach(r=>{
          const sku=text(r.querySelector("td:nth-child(2) small"));
          const box=r.querySelector<HTMLInputElement>('input[type="checkbox"]');
          const should=d.productSkus!.includes(sku);
          if(box&&box.checked!==should)box.click();
        });
      }

      const channelCards=Array.from(document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card"));
      const channelsReady=!d.activeAssets?.length||channelCards.length>0;
      if(channelCards.length){
        channelCards.forEach(card=>{
          const label=text(card.querySelector(".asset-select strong"));
          const box=card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]');
          const should=!!d.activeAssets?.includes(label);
          if(box&&box.checked!==should)box.click();
        });
        queueMicrotask(()=>{
          Array.from(document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card")).forEach(card=>{
            const asset=text(card.querySelector(".asset-select strong"));
            const wanted=d!.opportunities?.[asset]??[];
            card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(o=>{
              const label=text(o.querySelector("strong")).replace(/Paid$/,"" ).trim();
              const box=o.querySelector<HTMLInputElement>('input[type="checkbox"]');
              const should=wanted.includes(label);
              if(box&&box.checked!==should)box.click();
            });
          });
        });
      }

      const messaging=getMessaging();
      if(messaging){
        const inputs=Array.from(messaging.querySelectorAll<HTMLInputElement>("input"));
        const areas=Array.from(messaging.querySelectorAll<HTMLTextAreaElement>("textarea"));
        if(inputs[0]&&d.headline!=null)setNativeValue(inputs[0],d.headline);
        if(inputs[1]&&d.cta!=null)setNativeValue(inputs[1],d.cta);
        if(areas[0]&&d.coreMessage!=null)setNativeValue(areas[0],d.coreMessage);
        if(areas[1]&&d.objective!=null)setNativeValue(areas[1],d.objective);
      }

      if(productsReady&&channelsReady){restoring=false;setTimeout(save,0);return true;}
      return false;
    };

    const observer=new MutationObserver(()=>{
      const bodyText=document.body.textContent??"";
      if(bodyText.includes("Campaign plan approved. Step 7 creatives are ready for final review and authorization.")){
        try{localStorage.removeItem(KEY);}catch{}
        restoring=false;
        return;
      }
      if(restoring&&restoreAttempts++<40)restore();
    });
    observer.observe(document.body,{subtree:true,childList:true});

    const initialTimer=window.setTimeout(()=>restore(),50);
    const onChange=()=>save();
    document.addEventListener("input",onChange,true);
    document.addEventListener("change",onChange,true);
    document.addEventListener("click",onChange,true);
    window.addEventListener("pagehide",save);

    return()=>{
      window.clearTimeout(initialTimer);
      observer.disconnect();
      document.removeEventListener("input",onChange,true);
      document.removeEventListener("change",onChange,true);
      document.removeEventListener("click",onChange,true);
      window.removeEventListener("pagehide",save);
    };
  },[]);
  return null;
}
