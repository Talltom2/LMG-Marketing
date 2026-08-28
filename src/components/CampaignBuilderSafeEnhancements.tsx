"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";

type Step="3"|"4"|"5"|"5A";
type Targets={cards:Record<Step,HTMLElement>;headings:Record<Step,HTMLElement>;card3Recipe:string};
type Campaign={id:string;name:string;objective?:string|null;startDate:string;endDate:string;status:string;products?:{product:{sku:string;name:string}}[];recommendations?:{title?:string}[]};
type Messaging={headline:string;cta:string;coreMessage:string;objective:string};

const ACTIVE_KEY="lmg-active-campaign-id";
const COLLAPSE_PREFIX="lmg-safe-builder-collapse-v1:";
const steps:Step[]=["3","4","5","5A"];

function text(el:Element|null|undefined){return el?.textContent?.trim()??""}
function dateOnly(value:string){return value?value.slice(0,10):""}
function stage(step:Step){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(card=>text(card.querySelector(".stage-heading > span"))===step)??null}
function activeCampaignId(){try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}}
function setReactValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}
function channelFromTitle(title:string):string{
  if(/^WooCommerce\s*·/i.test(title)||/^WooCommerce/i.test(title))return"WOOCOMMERCE";
  if(/Pinterest/i.test(title))return"PINTEREST";
  if(/TikTok/i.test(title))return"TIKTOK";
  if(/Email/i.test(title))return"EMAIL";
  if(/Website|Homepage/i.test(title))return"WEBSITE_HOMEPAGE";
  if(/Facebook|Instagram|Meta/i.test(title))return"META";
  if(/Bing|Microsoft/i.test(title))return"BING";
  if(/Walmart Connect|Walmart Ads/i.test(title))return"WALMART_ADS";
  if(/Walmart/i.test(title))return"WALMART_MARKETPLACE";
  if(/Amazon Canada/i.test(title))return"AMAZON_CA";
  if(/Amazon Ads/i.test(title))return"AMAZON_ADS";
  if(/Amazon/i.test(title))return"AMAZON_US";
  return"";
}
const assetToChannel:Record<string,string>={
  "Website Homepage":"WEBSITE_HOMEPAGE","WooCommerce Store":"WOOCOMMERCE","Pinterest":"PINTEREST","TikTok":"TIKTOK","Facebook / Instagram":"META","Bing / Microsoft Ads":"BING","Walmart Marketplace":"WALMART_MARKETPLACE","Walmart Connect Ads":"WALMART_ADS","Amazon US Marketplace":"AMAZON_US","Amazon Ads":"AMAZON_ADS","Amazon Canada Marketplace":"AMAZON_CA","Email":"EMAIL"
};

export default function CampaignBuilderSafeEnhancements(){
  const pathname=usePathname();
  const[targets,setTargets]=useState<Targets|null>(null);
  const[collapsed,setCollapsed]=useState<Record<Step,boolean>>({"3":false,"4":false,"5":false,"5A":false});
  const[saveStatus,setSaveStatus]=useState("Autosaves to campaign");
  const saveTimer=useRef<number|undefined>(undefined);
  const applying=useRef(false);
  const lastVisualSignature=useRef("");

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let tries=0;
    const timer=window.setInterval(()=>{
      const found=Object.fromEntries(steps.map(s=>[s,stage(s)])) as Record<Step,HTMLElement|null>;
      const rows=document.querySelectorAll(".campaign-table tbody tr").length;
      if(steps.every(s=>!!found[s])&&rows>0){
        window.clearInterval(timer);
        const cards=found as Record<Step,HTMLElement>;
        const headings=Object.fromEntries(steps.map(s=>[s,cards[s].querySelector<HTMLElement>(".stage-heading")!])) as Record<Step,HTMLElement>;
        const recipe=text(headings["3"].querySelector("h2"))||"Product Spotlight / Evergreen asset recipe";
        const initial={"3":false,"4":false,"5":false,"5A":false} as Record<Step,boolean>;
        for(const s of steps){try{initial[s]=localStorage.getItem(`${COLLAPSE_PREFIX}${s}`)==="1"}catch{}}
        setCollapsed(initial);
        setTargets({cards,headings,card3Recipe:recipe});
      }else if(++tries>=120)window.clearInterval(timer);
    },100);
    return()=>window.clearInterval(timer);
  },[pathname]);

  useEffect(()=>{
    if(!targets)return;
    for(const s of steps){
      const heading=targets.headings[s];
      heading.style.position="relative";
      heading.style.paddingRight="44px";
      Array.from(targets.cards[s].children).forEach(child=>{
        const node=child as HTMLElement;
        if(node===heading)return;
        if(s==="5"&&node.classList.contains("approval-row")){node.style.display="none";return}
        node.style.display=collapsed[s]?"none":"";
      });
    }
    for(const s of ["3","5","5A"] as Step[]){
      const original=targets.headings[s].querySelector<HTMLElement>(":scope > div");
      if(original)original.style.display="none";
    }
  },[targets,collapsed]);

  useEffect(()=>{
    if(!targets)return;
    let cancelled=false;

    const approveMessaging=()=>{
      const button=Array.from(targets.cards["5"].querySelectorAll<HTMLButtonElement>("button")).find(b=>/Approve Messaging/i.test(text(b)));
      const row=button?.closest<HTMLElement>(".approval-row");
      if(row)row.style.display="none";
      if(button)window.setTimeout(()=>button.click(),0);
    };

    const visualSignature=()=>Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(row=>row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(row=>text(row.querySelector("td:nth-child(2) small"))).filter(Boolean).sort().join("|");
    const autoBuildVisuals=()=>{
      const build=Array.from(targets.cards["5A"].querySelectorAll<HTMLButtonElement>("button")).find(b=>/Build Campaign Visual Library|Refresh Campaign Visual Library/i.test(text(b)));
      if(!build)return;
      build.style.display="none";
      const signature=visualSignature();
      if(signature&&signature!==lastVisualSignature.current&&!build.disabled){
        lastVisualSignature.current=signature;
        window.setTimeout(()=>build.click(),0);
      }
    };

    const currentMessaging=():Messaging|null=>{
      const inputs=Array.from(targets.cards["5"].querySelectorAll<HTMLInputElement>(".creative-editor input"));
      const areas=Array.from(targets.cards["5"].querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea"));
      if(inputs.length<2||areas.length<2)return null;
      return{headline:inputs[0].value,cta:inputs[1].value,coreMessage:areas[0].value,objective:areas[1].value};
    };

    const persistMessaging=async(snap:Messaging)=>{
      const id=activeCampaignId();
      if(!id){setSaveStatus("Save the campaign once to enable persistent messaging");return}
      setSaveStatus("Saving to campaign…");
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/messaging`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(snap)});
        if(!r.ok)throw new Error();
        if(!cancelled)setSaveStatus("✓ Saved to campaign");
      }catch{if(!cancelled)setSaveStatus("Persistent save failed")}
    };

    const loadMessaging=async()=>{
      const id=activeCampaignId();if(!id)return;
      try{
        const r=await fetch(`/api/campaigns/${encodeURIComponent(id)}/messaging`,{cache:"no-store"});if(!r.ok)return;
        const d=await r.json() as {hasMessaging?:boolean;messaging?:Messaging};
        if(!d.hasMessaging||!d.messaging)return;
        const inputs=Array.from(targets.cards["5"].querySelectorAll<HTMLInputElement>(".creative-editor input"));
        const areas=Array.from(targets.cards["5"].querySelectorAll<HTMLTextAreaElement>(".creative-editor textarea"));
        applying.current=true;
        try{
          if(inputs[0])setReactValue(inputs[0],d.messaging.headline||"");
          if(inputs[1])setReactValue(inputs[1],d.messaging.cta||"");
          if(areas[0])setReactValue(areas[0],d.messaging.coreMessage||"");
          if(areas[1])setReactValue(areas[1],d.messaging.objective||"");
        }finally{applying.current=false}
        setSaveStatus("✓ Saved to campaign");
        approveMessaging();
      }catch{}
    };

    const hydrateActiveCampaign=async()=>{
      const id=activeCampaignId();if(!id)return;
      try{
        const r=await fetch("/api/campaigns",{cache:"no-store"});if(!r.ok)return;
        const d=await r.json() as {campaigns?:Campaign[]};
        const campaign=(d.campaigns??[]).find(c=>c.id===id);if(!campaign)return;
        const step1=document.querySelector<HTMLElement>(".campaign-details-card");if(!step1)return;
        const inputs=Array.from(step1.querySelectorAll<HTMLInputElement>("input"));
        const nameInput=inputs.find(i=>i.type!=="date"),dates=inputs.filter(i=>i.type==="date"),objective=step1.querySelector<HTMLTextAreaElement>("textarea");
        applying.current=true;
        try{
          if(nameInput&&nameInput.value!==campaign.name)setReactValue(nameInput,campaign.name);
          if(dates[0]&&dates[0].value!==dateOnly(campaign.startDate))setReactValue(dates[0],dateOnly(campaign.startDate));
          if(dates[1]&&dates[1].value!==dateOnly(campaign.endDate))setReactValue(dates[1],dateOnly(campaign.endDate));
          if(objective&&objective.value!==(campaign.objective??""))setReactValue(objective,campaign.objective??"");

          const wantedProducts=new Set((campaign.products??[]).map(p=>p.product.sku));
          document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr").forEach(row=>{
            const sku=text(row.querySelector("td:nth-child(2) small")),box=row.querySelector<HTMLInputElement>('input[type="checkbox"]');
            if(box&&sku&&box.checked!==wantedProducts.has(sku))box.click();
          });

          const wantedChannels=new Set((campaign.recommendations??[]).map(r=>channelFromTitle(r.title??"")).filter(Boolean));
          if(wantedChannels.size){
            document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
              const asset=text(card.querySelector(".asset-select strong")),channel=assetToChannel[asset],box=card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]');
              if(box&&channel&&box.checked!==wantedChannels.has(channel))box.click();
            });
          }
        }finally{applying.current=false}
      }catch{}
    };

    approveMessaging();
    autoBuildVisuals();
    void hydrateActiveCampaign().then(()=>window.setTimeout(autoBuildVisuals,100));
    void loadMessaging();

    const onInput=(event:Event)=>{
      if(applying.current)return;
      const target=event.target as HTMLElement|null;
      if(!target||!targets.cards["5"].contains(target))return;
      window.setTimeout(approveMessaging,0);
      const snap=currentMessaging();if(!snap)return;
      if(saveTimer.current)window.clearTimeout(saveTimer.current);
      saveTimer.current=window.setTimeout(()=>void persistMessaging(snap),650);
    };
    const onChange=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest(".campaign-table"))window.setTimeout(autoBuildVisuals,100);
    };
    document.addEventListener("input",onInput,true);
    document.addEventListener("change",onChange,true);
    return()=>{
      cancelled=true;
      if(saveTimer.current)window.clearTimeout(saveTimer.current);
      document.removeEventListener("input",onInput,true);
      document.removeEventListener("change",onChange,true);
    };
  },[targets]);

  function toggle(step:Step){
    setCollapsed(current=>{
      const next={...current,[step]:!current[step]};
      try{localStorage.setItem(`${COLLAPSE_PREFIX}${step}`,next[step]?"1":"0")}catch{}
      return next;
    });
  }

  if(pathname!=="/campaigns"||!targets)return null;
  const button=(step:Step)=>createPortal(<button type="button" aria-expanded={!collapsed[step]} aria-label={`${collapsed[step]?"Expand":"Collapse"} Card ${step}`} title={`${collapsed[step]?"Expand":"Collapse"} Card ${step}`} onClick={()=>toggle(step)} style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",width:30,height:30,minWidth:30,padding:0,border:0,background:"transparent",fontSize:22,fontWeight:800,lineHeight:1,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",zIndex:10}}>{collapsed[step]?"⌄":"⌃"}</button>,targets.headings[step]);

  return <>
    {createPortal(<div><p className="eyebrow">{targets.card3Recipe}</p><h2>Promotional assets, channels &amp; opportunities</h2></div>,targets.headings["3"])}
    {button("3")}
    {button("4")}
    {createPortal(<div><p className="eyebrow">Campaign messaging · {saveStatus}</p><h2>Create or edit campaign messaging</h2></div>,targets.headings["5"])}
    {button("5")}
    {createPortal(<div><p className="eyebrow">Campaign Visual Library</p><h2>Create and select campaign images and video</h2></div>,targets.headings["5A"])}
    {button("5A")}
  </>;
}
