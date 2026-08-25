"use client";

import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";

type Action={actionType?:string;description?:string;executionTarget?:string};
type Recommendation={title?:string;recommendation?:string;actions?:Action[]};
type Campaign={
  id:string;
  name:string;
  objective?:string|null;
  startDate:string;
  endDate:string;
  status:string;
  products?:{product:{sku:string;name:string}}[];
  recommendations?:Recommendation[];
};

type BuilderCopy={headline?:string;body?:string;cta?:string};

const OLD_DRAFT_KEY="lmg-marketing-campaign-builder-draft-v2";

function setNativeValue(el:HTMLInputElement|HTMLTextAreaElement,value:string){
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;
  setter?.call(el,value);
  el.dispatchEvent(new Event("input",{bubbles:true}));
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

function text(el:Element|null|undefined){return el?.textContent?.trim()??"";}
function campaignDate(value:string){return value?value.slice(0,10):"";}
function incomplete(status:string){return !["COMPLETED","CLOSED","CANCELLED","CANCELED","STOPPED"].includes(status.toUpperCase());}

const assetAliases:[RegExp,string][]=[
  [/website homepage/i,"Website Homepage"],
  [/woocommerce/i,"WooCommerce Store"],
  [/pinterest/i,"Pinterest"],
  [/tiktok/i,"TikTok"],
  [/facebook|instagram|meta/i,"Facebook / Instagram"],
  [/bing|microsoft/i,"Bing / Microsoft Ads"],
  [/walmart connect|walmart ads/i,"Walmart Connect Ads"],
  [/walmart/i,"Walmart Marketplace"],
  [/amazon canada|amazon ca/i,"Amazon Canada Marketplace"],
  [/amazon ads/i,"Amazon Ads"],
  [/amazon/i,"Amazon US Marketplace"],
  [/email/i,"Email"],
];

function assetLabelFromRecommendation(title:string){
  for(const[pattern,label]of assetAliases)if(pattern.test(title))return label;
  return "";
}

function savedCopy(campaign:Campaign):BuilderCopy{
  for(const rec of campaign.recommendations??[]){
    for(const action of rec.actions??[]){
      if(action.actionType!=="CREATIVE_DRAFT"||!action.description?.trim().startsWith("{"))continue;
      try{
        const parsed=JSON.parse(action.description) as {headline?:string;body?:string;cta?:string};
        return{headline:parsed.headline,body:parsed.body,cta:parsed.cta};
      }catch{}
    }
  }
  return{};
}

function wooOpportunityLabels(campaign:Campaign){
  return (campaign.recommendations??[])
    .map(r=>r.title??"")
    .filter(t=>/^WooCommerce\s*·/i.test(t))
    .map(t=>t.replace(/^WooCommerce\s*·\s*/i,"").trim())
    .filter(Boolean);
}

export default function CampaignDraftPersistence(){
  const pathname=usePathname();
  const[campaigns,setCampaigns]=useState<Campaign[]>([]);
  const[selectedId,setSelectedId]=useState("");
  const[status,setStatus]=useState("Start a new campaign, or select an incomplete/active campaign to resume.");
  const[ready,setReady]=useState(false);

  const resumable=useMemo(()=>campaigns.filter(c=>incomplete(c.status)),[campaigns]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{localStorage.removeItem(OLD_DRAFT_KEY);}catch{}
    fetch("/api/campaigns",{cache:"no-store"})
      .then(r=>r.ok?r.json():Promise.reject(new Error("Unable to load campaigns")))
      .then(data=>setCampaigns(data.campaigns??[]))
      .catch(()=>setStatus("Campaign list could not be loaded. You can still start a new campaign."));
    setReady(true);
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/campaigns"||!ready)return;
    let cancelled=false,attempts=0;
    const timer=window.setInterval(()=>{
      if(cancelled)return;
      const step1=document.querySelector<HTMLElement>(".campaign-details-card");
      const rows=document.querySelectorAll(".campaign-table tbody tr");
      const channels=document.querySelectorAll("#channels .opportunity-channel-card");
      if(step1&&rows.length&&channels.length){
        window.clearInterval(timer);
        if(!selectedId)resetForm();
      }else if(++attempts>40)window.clearInterval(timer);
    },100);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[pathname,ready]);

  function getStep1(){return document.querySelector<HTMLElement>(".campaign-details-card");}
  function getMessaging(){return Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector("h2")).includes("Edit and approve the campaign messaging"));}

  function resetForm(){
    const step1=getStep1();
    if(!step1)return;
    const inputs=Array.from(step1.querySelectorAll<HTMLInputElement>("input"));
    const name=inputs.find(i=>i.type!=="date");
    const dates=inputs.filter(i=>i.type==="date");
    const objective=step1.querySelector<HTMLTextAreaElement>("textarea");
    if(name)setNativeValue(name,"");
    dates.forEach(d=>setNativeValue(d,""));
    if(objective)setNativeValue(objective,"");

    document.querySelectorAll<HTMLInputElement>('.campaign-table tbody input[type="checkbox"]:checked').forEach(box=>box.click());
    document.querySelectorAll<HTMLInputElement>('#channels .asset-select input[type="checkbox"]:checked').forEach(box=>box.click());

    const messaging=getMessaging();
    if(messaging){
      messaging.querySelectorAll<HTMLInputElement>("input").forEach(i=>setNativeValue(i,""));
      messaging.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(a=>setNativeValue(a,""));
    }
    setStatus("Blank campaign ready. Nothing from the previous session has been loaded.");
  }

  function waitForBuilder(work:()=>void){
    let tries=0;
    const run=()=>{
      const ready=!!getStep1()&&document.querySelectorAll(".campaign-table tbody tr").length>0&&document.querySelectorAll("#channels .opportunity-channel-card").length>0;
      if(ready){work();return;}
      if(++tries<50)window.setTimeout(run,100);
      else setStatus("The campaign form did not finish loading. Refresh and try selecting the campaign again.");
    };
    run();
  }

  function loadCampaign(campaign:Campaign){
    resetForm();
    const step1=getStep1();
    if(!step1)return;
    const inputs=Array.from(step1.querySelectorAll<HTMLInputElement>("input"));
    const name=inputs.find(i=>i.type!=="date");
    const dates=inputs.filter(i=>i.type==="date");
    const objective=step1.querySelector<HTMLTextAreaElement>("textarea");
    if(name)setNativeValue(name,campaign.name??"");
    if(dates[0])setNativeValue(dates[0],campaignDate(campaign.startDate));
    if(dates[1])setNativeValue(dates[1],campaignDate(campaign.endDate));
    if(objective)setNativeValue(objective,campaign.objective??"");

    const wantedSkus=new Set((campaign.products??[]).map(p=>p.product.sku));
    document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr").forEach(row=>{
      const sku=text(row.querySelector("td:nth-child(2) small"));
      const box=row.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if(box&&wantedSkus.has(sku)&&!box.checked)box.click();
    });

    const wantedAssets=new Set<string>();
    for(const rec of campaign.recommendations??[]){
      const label=assetLabelFromRecommendation(rec.title??"");
      if(label)wantedAssets.add(label);
    }
    document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
      const label=text(card.querySelector(".asset-select strong"));
      const box=card.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]');
      if(box&&wantedAssets.has(label)&&!box.checked)box.click();
    });

    window.setTimeout(()=>{
      const wantedWoo=new Set(wooOpportunityLabels(campaign));
      if(wantedWoo.size){
        document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card").forEach(card=>{
          if(text(card.querySelector(".asset-select strong"))!=="WooCommerce Store")return;
          card.querySelectorAll<HTMLElement>(".opportunity-option").forEach(option=>{
            const label=text(option.querySelector("strong")).replace(/Paid$/,"" ).trim();
            const box=option.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const should=Array.from(wantedWoo).some(saved=>saved===label||saved.includes(label)||label.includes(saved));
            if(box&&box.checked!==should)box.click();
          });
        });
      }

      const copy=savedCopy(campaign),messaging=getMessaging();
      if(messaging){
        const mInputs=Array.from(messaging.querySelectorAll<HTMLInputElement>("input"));
        const areas=Array.from(messaging.querySelectorAll<HTMLTextAreaElement>("textarea"));
        if(mInputs[0]&&copy.headline!=null)setNativeValue(mInputs[0],copy.headline);
        if(mInputs[1]&&copy.cta!=null)setNativeValue(mInputs[1],copy.cta);
        if(areas[0]&&copy.body!=null)setNativeValue(areas[0],copy.body);
        if(areas[1]&&campaign.objective!=null)setNativeValue(areas[1],campaign.objective);
      }
      setStatus(`Loaded ${campaign.name} (${campaign.status}). Review or edit any field before continuing.`);
    },100);
  }

  function choose(value:string){
    setSelectedId(value);
    if(!value){waitForBuilder(resetForm);return;}
    const campaign=campaigns.find(c=>c.id===value);
    if(campaign)waitForBuilder(()=>loadCampaign(campaign));
  }

  if(pathname!=="/campaigns")return null;

  return <section style={{maxWidth:1100,margin:"18px auto 4px",padding:"16px 18px",border:"1px solid #d7dfd1",borderRadius:14,background:"#fff",boxShadow:"0 6px 18px rgba(30,50,30,.06)"}}>
    <div style={{display:"grid",gridTemplateColumns:"minmax(260px,1fr) minmax(320px,2fr)",gap:16,alignItems:"end"}}>
      <label style={{display:"grid",gap:6,fontWeight:800,color:"#233b27"}}>
        Campaign to work on
        <select value={selectedId} onChange={e=>choose(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1px solid #aebca8",borderRadius:8,background:"white",fontSize:15}}>
          <option value="">+ Start a new campaign (blank)</option>
          {resumable.map(c=><option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}
        </select>
      </label>
      <p style={{margin:0,padding:"10px 12px",borderRadius:8,background:"#f5f8f2",color:"#526052",fontSize:14}}>{status}</p>
    </div>
  </section>;
}
