"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

type MessagingSnapshot={headline:string;cta:string;coreMessage:string;objective:string;savedAt?:string};

const COLLAPSE_PREFIX="lmg-campaign-builder-card-collapsed-v1:";
const MESSAGE_PREFIX="lmg-campaign-messaging-content-v1:";

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function stepCard(step:string){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(card=>text(card.querySelector(".stage-heading > span"))===step)}
function activeCampaignId(){try{return localStorage.getItem("lmg-active-campaign-id")||""}catch{return""}}
function activeCampaignKey(){return activeCampaignId()||text(document.querySelector(".campaign-name-title"))||"builder-draft"}
function messagingKey(){return `${MESSAGE_PREFIX}${activeCampaignKey()}`}
function setReactValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
}

export default function CampaignBuilderCardControls(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let cancelled=false;
    let lastVisualSignature="";
    let restoredLocalKey="";
    let loadedCampaignId="";
    let loadingCampaignId="";
    let saveTimer:number|undefined;
    let persistBusy=false;
    let pendingSnapshot:MessagingSnapshot|null=null;
    let applyingMessaging=false;

    const setCollapsed=(card:HTMLElement,step:string,collapsed:boolean,button:HTMLButtonElement)=>{
      Array.from(card.children).forEach(child=>{
        const node=child as HTMLElement;
        if(node.classList.contains("stage-heading"))return;
        node.style.display=collapsed?"none":"";
      });
      button.textContent=collapsed?"⌄":"⌃";
      button.setAttribute("aria-expanded",String(!collapsed));
      button.setAttribute("title",collapsed?`Expand Card ${step}`:`Collapse Card ${step}`);
      button.setAttribute("aria-label",collapsed?`Expand Card ${step}`:`Collapse Card ${step}`);
      try{localStorage.setItem(`${COLLAPSE_PREFIX}${step}`,collapsed?"1":"0")}catch{}
    };

    const installCollapse=(step:string)=>{
      const card=stepCard(step);
      const heading=card?.querySelector<HTMLElement>(".stage-heading");
      if(!card||!heading)return;
      heading.style.position="relative";
      heading.style.paddingRight="44px";
      let button=heading.querySelector<HTMLButtonElement>(`.lmg-builder-card-toggle[data-step="${step}"]`);
      if(!button){
        button=document.createElement("button");
        button.type="button";
        button.className="lmg-builder-card-toggle";
        button.dataset.step=step;
        Object.assign(button.style,{position:"absolute",right:"4px",top:"50%",transform:"translateY(-50%)",width:"30px",height:"30px",minWidth:"30px",padding:"0",border:"0",background:"transparent",fontSize:"22px",fontWeight:"800",lineHeight:"1",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",zIndex:"10"});
        heading.appendChild(button);
        button.addEventListener("click",()=>{
          const currentlyCollapsed=button!.getAttribute("aria-expanded")==="false";
          setCollapsed(card,step,!currentlyCollapsed,button!);
        });
      }
      let collapsed=false;
      try{collapsed=localStorage.getItem(`${COLLAPSE_PREFIX}${step}`)==="1"}catch{}
      setCollapsed(card,step,collapsed,button);
    };

    const fixCard3Title=()=>{
      const card=stepCard("3"),eyebrow=card?.querySelector<HTMLElement>(".stage-heading .eyebrow"),title=card?.querySelector<HTMLElement>(".stage-heading h2");
      if(!card||!eyebrow||!title)return;
      const desired="Promotional assets, channels & opportunities";
      if(text(title)!==desired){
        const recipe=text(title);
        if(recipe&&recipe!==desired)card.dataset.lmgCard3Recipe=recipe;
      }
      const recipe=card.dataset.lmgCard3Recipe||"Product Spotlight / Evergreen asset recipe";
      if(text(title)!==desired)title.textContent=desired;
      if(text(eyebrow)!==recipe)eyebrow.textContent=recipe;
    };

    const currentMessaging=():MessagingSnapshot|null=>{
      const card=stepCard("5");if(!card)return null;
      const inputs=Array.from(card.querySelectorAll<HTMLInputElement>(".creative-editor input"));
      const areas=Array.from(card.querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea"));
      if(inputs.length<2||areas.length<2)return null;
      return{headline:inputs[0].value,cta:inputs[1].value,coreMessage:areas[0].value,objective:areas[1].value,savedAt:new Date().toISOString()};
    };

    const readLocalMessaging=(key:string)=>{
      try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as MessagingSnapshot:null}catch{return null}
    };
    const cacheMessaging=(snap:MessagingSnapshot)=>{try{localStorage.setItem(messagingKey(),JSON.stringify({...snap,savedAt:new Date().toISOString()}))}catch{}};

    const applyMessaging=(snap:MessagingSnapshot)=>{
      const card=stepCard("5");if(!card)return;
      const inputs=Array.from(card.querySelectorAll<HTMLInputElement>(".creative-editor input"));
      const areas=Array.from(card.querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea"));
      applyingMessaging=true;
      try{
        if(inputs[0]&&inputs[0].value!==snap.headline)setReactValue(inputs[0],snap.headline);
        if(inputs[1]&&inputs[1].value!==snap.cta)setReactValue(inputs[1],snap.cta);
        if(areas[0]&&areas[0].value!==snap.coreMessage)setReactValue(areas[0],snap.coreMessage);
        if(areas[1]&&areas[1].value!==snap.objective)setReactValue(areas[1],snap.objective);
      }finally{applyingMessaging=false}
    };

    const persistSnapshot=async(campaignId:string,snap:MessagingSnapshot)=>{
      const response=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/messaging`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({headline:snap.headline,cta:snap.cta,coreMessage:snap.coreMessage,objective:snap.objective})
      });
      if(!response.ok)throw new Error("Campaign messaging could not be saved.");
      cacheMessaging(snap);
    };

    const flushPersistentSave=async()=>{
      if(cancelled||persistBusy||!pendingSnapshot)return;
      const campaignId=activeCampaignId();
      if(!campaignId)return;
      const snap=pendingSnapshot;
      pendingSnapshot=null;
      persistBusy=true;
      try{await persistSnapshot(campaignId,snap)}catch{pendingSnapshot=snap}finally{
        persistBusy=false;
        if(pendingSnapshot&&!cancelled)saveTimer=window.setTimeout(()=>void flushPersistentSave(),750);
      }
    };

    const queuePersistentSave=(snap:MessagingSnapshot)=>{
      cacheMessaging(snap);
      if(!activeCampaignId())return;
      pendingSnapshot=snap;
      if(saveTimer)window.clearTimeout(saveTimer);
      saveTimer=window.setTimeout(()=>void flushPersistentSave(),650);
    };

    const restoreLocalMessaging=()=>{
      const key=messagingKey();if(restoredLocalKey===key)return;
      restoredLocalKey=key;
      const snap=readLocalMessaging(key);
      if(snap)applyMessaging(snap);
    };

    const loadPersistentMessaging=async()=>{
      const campaignId=activeCampaignId();
      if(!campaignId){restoreLocalMessaging();return}
      if(loadedCampaignId===campaignId||loadingCampaignId===campaignId)return;
      loadingCampaignId=campaignId;
      try{
        const response=await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/messaging`,{cache:"no-store"});
        if(!response.ok)throw new Error();
        const data=await response.json() as {hasMessaging?:boolean;messaging?:MessagingSnapshot};
        if(activeCampaignId()!==campaignId)return;
        const local=readLocalMessaging(messagingKey());
        if(data.hasMessaging&&data.messaging){
          applyMessaging(data.messaging);
          cacheMessaging(data.messaging);
        }else{
          const snap=local??currentMessaging();
          if(snap){applyMessaging(snap);await persistSnapshot(campaignId,snap)}
        }
        loadedCampaignId=campaignId;
      }catch{}finally{if(loadingCampaignId===campaignId)loadingCampaignId=""}
    };

    const unlockMessaging=()=>{
      const card=stepCard("5");if(!card)return;
      const eyebrow=card.querySelector<HTMLElement>(".stage-heading .eyebrow"),title=card.querySelector<HTMLElement>(".stage-heading h2");
      if(eyebrow&&text(eyebrow)!=="Campaign messaging")eyebrow.textContent="Campaign messaging";
      if(title&&text(title)!=="Create or edit campaign messaging")title.textContent="Create or edit campaign messaging";
      const approve=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve Messaging/i.test(text(b)));
      const row=approve?.closest<HTMLElement>(".approval-row");
      if(row)row.style.display="none";
      if(approve)window.setTimeout(()=>approve.click(),0);
    };

    const visualSignature=()=>Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(row=>row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(row=>text(row.querySelector("td:nth-child(2) small"))).filter(Boolean).sort().join("|");

    const configureVisuals=()=>{
      const card=stepCard("5A");if(!card)return;
      const eyebrow=card.querySelector<HTMLElement>(".stage-heading .eyebrow"),title=card.querySelector<HTMLElement>(".stage-heading h2");
      if(eyebrow&&text(eyebrow)!=="Campaign media")eyebrow.textContent="Campaign media";
      if(title&&text(title)!=="Create and select campaign images and video")title.textContent="Create and select campaign images and video";
      const build=Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find(b=>/Build Campaign Visual Library|Refresh Campaign Visual Library/i.test(text(b)));
      if(!build)return;
      build.style.display="none";
      const signature=visualSignature();
      if(signature&&signature!==lastVisualSignature&&!build.disabled){
        lastVisualSignature=signature;
        window.setTimeout(()=>build.click(),0);
      }
    };

    const ensure=()=>{
      if(cancelled)return;
      fixCard3Title();
      ["3","4","5","5A"].forEach(installCollapse);
      unlockMessaging();
      configureVisuals();
      void loadPersistentMessaging();
    };

    let tries=0;
    const wait=()=>{if(stepCard("3")&&stepCard("4")&&stepCard("5")&&stepCard("5A")){ensure();return}if(++tries<100)window.setTimeout(wait,100)};
    wait();

    const observer=new MutationObserver(()=>ensure());
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    const campaignWatch=window.setInterval(()=>void loadPersistentMessaging(),750);

    const onInput=(event:Event)=>{
      if(applyingMessaging)return;
      const target=event.target as HTMLElement|null;
      const card5=stepCard("5");
      if(card5&&target&&card5.contains(target)){
        const snap=currentMessaging();
        if(snap)queuePersistentSave(snap);
        window.setTimeout(unlockMessaging,0);
      }
    };
    const onChange=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest(".campaign-table"))window.setTimeout(configureVisuals,50);
    };
    document.addEventListener("input",onInput,true);
    document.addEventListener("change",onChange,true);

    return()=>{
      cancelled=true;
      observer.disconnect();
      window.clearInterval(campaignWatch);
      if(saveTimer)window.clearTimeout(saveTimer);
      document.removeEventListener("input",onInput,true);
      document.removeEventListener("change",onChange,true);
    };
  },[pathname]);

  return null;
}
