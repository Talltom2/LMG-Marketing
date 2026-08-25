"use client";

import {useEffect} from "react";

const COLLECTION_URL_KEY="lmg-campaign-collection-destinations-v1";

type UrlMap=Record<string,string>;

function readUrls():UrlMap{try{return JSON.parse(localStorage.getItem(COLLECTION_URL_KEY)??"{}") as UrlMap}catch{return{}}}
function writeUrls(value:UrlMap){try{localStorage.setItem(COLLECTION_URL_KEY,JSON.stringify(value))}catch{}}
function validUrl(value:string){try{const u=new URL(value);return u.protocol==="http:"||u.protocol==="https:"}catch{return false}}
function requestKind(text:string){const value=text.toLowerCase();if(/image|photo|visual|lifestyle|picture|scene|background|showing all|all versions|all of the versions/.test(value))return"IMAGE";return"COPY"}
function setNativeValue(el:HTMLTextAreaElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set;setter?.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
function cardKey(card:HTMLElement){return `${card.querySelector(".eyebrow")?.textContent?.trim()??"channel"}::${card.querySelector("h3")?.textContent?.trim()??"opportunity"}`}
function isCollectionLandingCard(card:HTMLElement){const channel=card.querySelector(".eyebrow")?.textContent?.trim()??"";const title=card.querySelector("h3")?.textContent?.trim()??"";return /woocommerce/i.test(channel)&&/(collection|landing page)/i.test(title)}
function selectedSourceImage(card:HTMLElement){const previews=Array.from(card.querySelectorAll<HTMLImageElement>("img"));return previews.find(i=>i.src)?.src??""}

export default function CampaignOpportunityRevisionRouter(){
 useEffect(()=>{
  if(location.pathname!=="/campaigns")return;

  const enhanceCollectionCards=()=>{
   const urls=readUrls();
   for(const card of Array.from(document.querySelectorAll<HTMLElement>("article.creative-card"))){
    if(!isCollectionLandingCard(card)||card.dataset.lmgCollectionDestination==="1")continue;
    card.dataset.lmgCollectionDestination="1";
    const key=cardKey(card);
    const copyEditor=card.querySelector<HTMLElement>(".creative-copy-edit");
    if(!copyEditor)continue;
    const panel=document.createElement("div");
    panel.className="creative-copy-edit";
    panel.dataset.lmgCollectionUrlPanel="1";
    panel.style.marginTop="12px";
    panel.innerHTML=`<label class="editor-wide"><strong>Collection page URL</strong><input type="url" data-lmg-collection-url placeholder="https://laughingmoosegifts.com/product-category/rustic-rooster/" value="${(urls[key]??"").replace(/"/g,"&quot;")}"></label><div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap"><a data-lmg-view-collection href="#" target="_blank" rel="noreferrer" style="display:none;font-weight:800">View Collection Page ↗</a><small data-lmg-url-status style="color:#647064">Enter the WooCommerce collection URL that this landing-page opportunity should promote.</small></div>`;
    copyEditor.insertAdjacentElement("beforebegin",panel);
    const input=panel.querySelector<HTMLInputElement>("[data-lmg-collection-url]");
    const link=panel.querySelector<HTMLAnchorElement>("[data-lmg-view-collection]");
    const status=panel.querySelector<HTMLElement>("[data-lmg-url-status]");
    const sync=()=>{const value=input?.value.trim()??"";const all=readUrls();if(value)all[key]=value;else delete all[key];writeUrls(all);if(link){link.href=validUrl(value)?value:"#";link.style.display=validUrl(value)?"inline":"none"}if(status)status.textContent=value&&!validUrl(value)?"Enter a complete https:// collection URL.":validUrl(value)?"Destination saved for this opportunity.":"Enter the WooCommerce collection URL that this landing-page opportunity should promote."};
    input?.addEventListener("input",sync);sync();
   }
  };

  const handleRevision=async(event:Event)=>{
   const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>("button");
   if(!button||!/regenerat|revision|requested change|apply change/i.test(button.textContent??""))return;
   const card=button.closest<HTMLElement>("article.creative-card");if(!card)return;
   const comment=Array.from(card.querySelectorAll<HTMLTextAreaElement>("textarea")).find(t=>/request a specific change/i.test(t.closest("label")?.textContent??""));
   const request=comment?.value.trim()??"";
   if(!request||requestKind(request)!=="IMAGE")return;

   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   button.disabled=true;const prior=button.textContent??"Apply requested change";button.textContent="Generating requested visual…";
   let status=card.querySelector<HTMLElement>("[data-lmg-revision-status]");
   if(!status){status=document.createElement("p");status.dataset.lmgRevisionStatus="1";status.style.margin="8px 0";status.style.fontWeight="800";comment?.closest("label")?.insertAdjacentElement("afterend",status)}
   if(status)status.textContent="Image request recognized — creating a new campaign visual. Body copy will not be changed.";
   try{
    const title=card.querySelector("h3")?.textContent?.trim()??"campaign opportunity";
    const response=await fetch("/api/campaigns/visual-generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:`Create a polished ecommerce lifestyle image for the ${title} opportunity. User revision request: ${request}. Preserve product appearance accurately and create a coherent merchandising scene suitable for the landing page.`,sourceImageUrl:selectedSourceImage(card)})});
    const data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to generate requested image");
    let preview=Array.from(card.querySelectorAll<HTMLElement>(".creative-preview")).find(p=>p.querySelector("img"));
    if(!preview){preview=document.createElement("div");preview.className="creative-preview";card.querySelector(".creative-copy-edit")?.insertAdjacentElement("beforebegin",preview)}
    if(preview){preview.innerHTML="";const img=document.createElement("img");img.src=String(data.imageUrl);img.alt=`AI generated revision for ${title}`;img.style.width="100%";img.style.height="auto";img.style.borderRadius="12px";preview.appendChild(img)}
    if(comment)setNativeValue(comment,"");
    if(status)status.textContent="✓ Requested visual generated. Review the new image before approving this opportunity.";
    button.textContent="Generate another revision";
   }catch(error){if(status)status.textContent=error instanceof Error?error.message:"Image generation failed";button.textContent=prior}
   finally{button.disabled=false}
  };

  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceCollectionCards));
  observer.observe(document.querySelector("main")??document.body,{childList:true,subtree:true});
  document.addEventListener("click",handleRevision,true);
  requestAnimationFrame(enhanceCollectionCards);
  return()=>{observer.disconnect();document.removeEventListener("click",handleRevision,true)};
 },[]);
 return null;
}
