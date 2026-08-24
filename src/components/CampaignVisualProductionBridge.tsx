"use client";

import {useEffect} from "react";

const STORAGE_KEY="lmg-campaign-generated-visuals-v1";
type VisualMap=Record<string,string>;

function readStored():VisualMap{try{return JSON.parse(sessionStorage.getItem(STORAGE_KEY)??"{}") as VisualMap;}catch{return{};}}
function writeStored(value:VisualMap){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}}
function labelFromOption(text:string){return text.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim();}

export default function CampaignVisualProductionBridge(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;
  const memory:VisualMap=readStored();

  const sourceFor=(label:string)=>{const product=label.replace(/\s·\sAI lifestyle concept$/i,"").trim();for(const card of Array.from(document.querySelectorAll<HTMLElement>("article.creative-card"))){const title=card.querySelector("h3")?.textContent?.trim()??"";if(title===`${product} · primary product image`){const img=card.querySelector<HTMLImageElement>("img");if(img?.src)return img.src;}}return "";};
  const renderGenerated=(card:HTMLElement,label:string)=>{const url=memory[label];if(!url)return;const preview=card.querySelector<HTMLElement>(".creative-preview");if(!preview)return;if(preview.querySelector("img[data-lmg-generated='1']"))return;preview.innerHTML="";const img=document.createElement("img");img.src=url;img.alt=label;img.dataset.lmgGenerated="1";img.style.width="100%";img.style.height="auto";img.style.borderRadius="12px";preview.appendChild(img);};

  const enhanceStep5A=()=>{const headings=Array.from(document.querySelectorAll<HTMLElement>(".stage-heading"));const heading=headings.find(h=>h.textContent?.includes("Campaign Visual Library"));const section=heading?.closest<HTMLElement>(".campaign-stage-panel");if(!section)return;const button=Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Campaign Visual Library/i.test(b.textContent??""));if(!button)return;const checkedProducts=Array.from(document.querySelectorAll<HTMLInputElement>(".campaign-table tbody input[type='checkbox']:checked"));let blocker=section.querySelector<HTMLElement>("[data-lmg-visual-gate='1']");if(checkedProducts.length>0){if(button.disabled)button.disabled=false;button.removeAttribute("title");blocker?.remove();}else{if(!blocker){blocker=document.createElement("p");blocker.dataset.lmgVisualGate="1";blocker.className="gate-blocker";button.insertAdjacentElement("afterend",blocker);}blocker.textContent="Select at least one product in Step 2 to activate the Campaign Visual Library. Messaging approval does not control Step 5A.";button.title="Select at least one product in Step 2";}};

  const enhanceGeneratorButtons=()=>{for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>("button"))){if(button.textContent?.trim()!=="Generate Lifestyle Image"||button.dataset.lmgVisualGenerator==="1")continue;const card=button.closest<HTMLElement>("article.creative-card");if(!card)continue;const label=card.querySelector("h3")?.textContent?.trim()??"";if(!label)continue;button.dataset.lmgVisualGenerator="1";renderGenerated(card,label);button.addEventListener("click",async(event)=>{event.preventDefault();event.stopImmediatePropagation();const prompt=card.querySelector<HTMLElement>(".creative-preview p")?.textContent?.trim()??"";if(!prompt){button.textContent="Missing image brief";return;}button.disabled=true;button.textContent="Generating lifestyle image…";try{const response=await fetch("/api/campaigns/visual-generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,sourceImageUrl:sourceFor(label)})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to generate image");memory[label]=String(data.imageUrl);writeStored(memory);renderGenerated(card,label);button.textContent="Generate New Alternative";}catch(error){button.textContent=error instanceof Error?error.message:"Generation failed";}finally{button.disabled=false;}},true);}};

  const enhancePinterestCard=(card:HTMLElement)=>{
    if(card.dataset.lmgPinterestFields==="1")return;
    const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"";if(channel!=="Pinterest")return;
    card.dataset.lmgPinterestFields="1";
    const headlineInput=Array.from(card.querySelectorAll<HTMLInputElement>("input")).find(i=>i.closest("label")?.textContent?.includes("Headline"));
    const body=card.querySelector<HTMLTextAreaElement>(".creative-copy-edit textarea");
    const anchor=card.querySelector(".creative-copy-edit");if(!anchor)return;
    const panel=document.createElement("div");panel.className="creative-copy-edit";panel.dataset.lmgPinterestCopy="1";
    panel.innerHTML=`<label>On-image copy<input data-pin-overlay maxlength="70" placeholder="Short headline displayed on the Pin image"></label><label>Pin title<input data-pin-title maxlength="100" placeholder="Pinterest Pin title"></label><label class="editor-wide">Pin description<textarea data-pin-description rows="4" maxlength="800" placeholder="Discovery / SEO description; not normally shown in the home feed"></textarea></label><p class="editor-wide creative-spec"><strong>Pinterest visual spec:</strong> Standard Pin · 2:3 portrait · 1000 × 1500 recommended. Keep on-image copy short and legible; preserve a clean no-text master image in the Campaign Visual Library for reuse on other channels.</p>`;
    anchor.insertAdjacentElement("afterend",panel);
    const overlay=panel.querySelector<HTMLInputElement>("[data-pin-overlay]");const title=panel.querySelector<HTMLInputElement>("[data-pin-title]");const desc=panel.querySelector<HTMLTextAreaElement>("[data-pin-description]");
    if(overlay)overlay.value=headlineInput?.value??"";if(title)title.value=headlineInput?.value??"";if(desc)desc.value=body?.value??"";
    const markReview=()=>{const status=card.querySelector<HTMLElement>(".creative-version");if(status&&status.textContent?.includes("APPROVED"))status.textContent=status.textContent.replace("APPROVED","REVIEW");};
    panel.addEventListener("input",markReview);
  };

  const enhanceStep7=()=>{const section=document.querySelector<HTMLElement>("#creative-approval");if(!section)return;for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){enhancePinterestCard(card);const select=card.querySelector<HTMLSelectElement>("select");if(!select)continue;const apply=()=>{const option=select.options[select.selectedIndex];if(!option)return;const label=labelFromOption(option.textContent??"");if(memory[label])renderGenerated(card,label);};apply();if(select.dataset.lmgVisualSelect!=="1"){select.dataset.lmgVisualSelect="1";select.addEventListener("change",()=>setTimeout(apply,0));}}};

  const enhance=()=>{enhanceStep5A();enhanceGeneratorButtons();enhanceStep7();};enhance();const observer=new MutationObserver(()=>enhance());observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["checked","disabled"]});document.addEventListener("change",enhance,true);return()=>{observer.disconnect();document.removeEventListener("change",enhance,true);};
 },[]);
 return null;
}
