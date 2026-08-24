"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-generated-visuals-v1";
type VisualMap=Record<string,string>;

function readStored():VisualMap{
  try{return JSON.parse(sessionStorage.getItem(STORAGE_KEY)??"{}") as VisualMap;}catch{return{};}
}
function writeStored(value:VisualMap){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}}
function labelFromOption(text:string){return text.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim();}

export default function CampaignVisualProductionBridge(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  const memory:VisualMap=readStored();

  const sourceFor=(label:string)=>{
    const product=label.replace(/\s·\sAI lifestyle concept$/i,"").trim();
    for(const card of Array.from(document.querySelectorAll<HTMLElement>("article.creative-card"))){
      const title=card.querySelector("h3")?.textContent?.trim()??"";
      if(title===`${product} · primary product image`){const img=card.querySelector<HTMLImageElement>("img");if(img?.src)return img.src;}
    }
    return "";
  };

  const renderGenerated=(card:HTMLElement,label:string)=>{
    const url=memory[label];if(!url)return;
    const preview=card.querySelector<HTMLElement>(".creative-preview");if(!preview)return;
    if(preview.querySelector("img[data-lmg-generated='1']"))return;
    preview.innerHTML="";
    const img=document.createElement("img");img.src=url;img.alt=label;img.dataset.lmgGenerated="1";img.style.width="100%";img.style.height="auto";img.style.borderRadius="12px";preview.appendChild(img);
  };

  const enhanceGeneratorButtons=()=>{
    for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>("button"))){
      if(button.textContent?.trim()!=="Generate Lifestyle Image"||button.dataset.lmgVisualGenerator==="1")continue;
      const card=button.closest<HTMLElement>("article.creative-card");if(!card)continue;
      const label=card.querySelector("h3")?.textContent?.trim()??"";if(!label)continue;
      button.dataset.lmgVisualGenerator="1";
      renderGenerated(card,label);
      button.addEventListener("click",async(event)=>{
        event.preventDefault();event.stopImmediatePropagation();
        const prompt=card.querySelector<HTMLElement>(".creative-preview p")?.textContent?.trim()??"";
        if(!prompt){button.textContent="Missing image brief";return;}
        button.disabled=true;button.textContent="Generating lifestyle image…";
        try{
          const response=await fetch("/api/campaigns/visual-generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,sourceImageUrl:sourceFor(label)})});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error??"Unable to generate image");
          memory[label]=String(data.imageUrl);writeStored(memory);renderGenerated(card,label);
          button.textContent="Generate New Alternative";
        }catch(error){button.textContent=error instanceof Error?error.message:"Generation failed";}
        finally{button.disabled=false;}
      },true);
    }
  };

  const enhanceStep7=()=>{
    const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;
    for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
      const select=card.querySelector<HTMLSelectElement>("select");if(!select)continue;
      const apply=()=>{const option=select.options[select.selectedIndex];if(!option)return;const label=labelFromOption(option.textContent??"");if(memory[label])renderGenerated(card,label);};
      apply();
      if(select.dataset.lmgVisualSelect!=="1"){select.dataset.lmgVisualSelect="1";select.addEventListener("change",()=>setTimeout(apply,0));}
    }
  };

  const enhance=()=>{enhanceGeneratorButtons();enhanceStep7();};
  enhance();
  const observer=new MutationObserver(()=>enhance());observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return null;
}
