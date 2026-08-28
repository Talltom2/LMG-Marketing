"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const PREFIX="lmg-campaign-generated-visuals-v2:";
const APPROVAL_KEY="lmg-campaign-approved-visuals-v1";
const BRIDGE_KEY="lmg-campaign-generated-visuals-v1";
type VisualMap=Record<string,string>;
type ApprovalMap=Record<string,string[]>;

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function clean(value:string){return value.replace(/\s·\s(?:SOURCE|RECOMMENDED|APPROVED)$/i,"").trim()}
function campaignId(){try{return localStorage.getItem(ACTIVE_KEY)||"builder-draft"}catch{return"builder-draft"}}
function key(){return `${PREFIX}${campaignId()}`}
function read():VisualMap{try{return JSON.parse(localStorage.getItem(key())??"{}") as VisualMap}catch{return{}}}
function write(value:VisualMap){try{localStorage.setItem(key(),JSON.stringify(value))}catch{}}
function readApprovals():ApprovalMap{try{return JSON.parse(localStorage.getItem(APPROVAL_KEY)??"{}") as ApprovalMap}catch{return{}}}
function writeApprovals(value:ApprovalMap){try{localStorage.setItem(APPROVAL_KEY,JSON.stringify(value))}catch{}}
function campaignKey(){
  const labels=Array.from(document.querySelectorAll<HTMLLabelElement>("label"));
  const campaignLabel=labels.find(l=>/^Campaign name/i.test(l.textContent?.trim()??""));
  const name=campaignLabel?.querySelector<HTMLInputElement>("input")?.value.trim();
  if(name)return name.toLowerCase();
  const active=document.querySelector<HTMLElement>("[data-active-campaign-name]")?.dataset.activeCampaignName?.trim();
  return (active||"builder-draft").toLowerCase();
}
function visualSection(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector(".stage-heading > span"))==="5A")??null}
function isAiCard(card:HTMLElement){return /AI visual/i.test(text(card.querySelector(".eyebrow")))}

function rememberForStep7(label:string,url:string){
  try{
    const map=JSON.parse(sessionStorage.getItem(BRIDGE_KEY)??"{}") as VisualMap;
    if(map[label]!==url){map[label]=url;sessionStorage.setItem(BRIDGE_KEY,JSON.stringify(map))}
  }catch{}
}

function markApproved(card:HTMLElement,label:string){
  const version=card.querySelector<HTMLElement>(".creative-version");
  if(version&&!/APPROVED/i.test(version.textContent??""))version.textContent="APPROVED";
  card.classList.remove("status-source","status-recommended");
  card.classList.add("status-approved");
  const button=card.querySelector<HTMLButtonElement>("[data-lmg-ai-campaign-select='1']");
  if(button){button.textContent="✓ Saved to Campaign";button.disabled=true}
  const all=readApprovals(),ck=campaignKey(),current=new Set(all[ck]??[]);
  if(!current.has(label)){current.add(label);all[ck]=[...current];writeApprovals(all)}
}

function ensureSelectControl(card:HTMLElement,label:string,url:string){
  if(!isAiCard(card)||!url)return;
  rememberForStep7(label,url);
  const all=readApprovals();
  const approved=(all[campaignKey()]??[]).includes(label)||/APPROVED/i.test(text(card.querySelector(".creative-version")));
  if(approved)markApproved(card,label);

  const native=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve for Campaign|✓ Approved/i.test(text(b)));
  if(native)return;

  let button=card.querySelector<HTMLButtonElement>("[data-lmg-ai-campaign-select='1']");
  if(!button){
    button=document.createElement("button");
    button.type="button";
    button.className="primary-button";
    button.dataset.lmgAiCampaignSelect="1";
    const actions=card.querySelector<HTMLElement>(".creative-actions")??card;
    actions.insertBefore(button,actions.firstChild);
    button.addEventListener("click",()=>{
      markApproved(card,label);
      document.dispatchEvent(new Event("lmg-builder-state-changed"));
    });
  }
  button.textContent=approved?"✓ Saved to Campaign":"Select & Save to Campaign";
  button.disabled=approved;
}

export default function CampaignGeneratedVisualPersistence(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let frame=0,lastSignature="";

    const sync=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const section=visualSection();if(!section)return;
        const saved=read();
        let changed=false;

        for(const card of Array.from(section.querySelectorAll<HTMLElement>("article.creative-card"))){
          const label=clean(text(card.querySelector("h3")));if(!label)continue;
          const preview=card.querySelector<HTMLElement>(".creative-preview");if(!preview)continue;
          let generated=preview.querySelector<HTMLImageElement>("img[data-lmg-generated='1']");

          if(!generated&&saved[label]&&isAiCard(card)){
            const brief=preview.querySelector("p")?.textContent?.trim()??card.dataset.lmgImageBrief??"";
            preview.innerHTML="";
            generated=document.createElement("img");
            generated.src=saved[label];generated.alt=label;generated.dataset.lmgGenerated="1";
            generated.style.width="100%";generated.style.height="auto";generated.style.borderRadius="12px";
            preview.appendChild(generated);
            if(brief){const p=document.createElement("p");p.textContent=brief;p.style.display="none";p.dataset.lmgPreservedBrief="1";preview.appendChild(p)}
          }

          if(generated?.src&&saved[label]!==generated.src){saved[label]=generated.src;changed=true}
          const url=generated?.src||saved[label];
          if(url)ensureSelectControl(card,label,url);
        }

        const signature=JSON.stringify(saved);
        if(changed){write(saved);if(signature!==lastSignature){lastSignature=signature;document.dispatchEvent(new Event("lmg-builder-state-changed"))}}
        else lastSignature=signature;
      });
    };

    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","class"]});
    document.addEventListener("click",sync,true);
    return()=>{observer.disconnect();document.removeEventListener("click",sync,true);cancelAnimationFrame(frame)};
  },[pathname]);

  return null;
}
