"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";

type Board={id:string;name:string;description?:string;pinCount?:number};
type PinPreview={board_id:string;title:string;description:string;link:string;alt_text:string;media_source:{source_type:string;url:string};_meta?:{sku?:string;productName?:string;opportunityId?:string}};

const supported:Record<string,string>={
  "Organic Product Pins":"organic-product-pins",
  "Seasonal / Theme Board Push":"seasonal-board",
  "Inspirational / Lifestyle Pins":"inspiration-content",
};
const paidLabels=new Set(["Paid Pinterest Campaign","Pinterest Retargeting"]);
const text=(el:Element|null|undefined)=>el?.textContent?.trim()??"";

function findPinterestCard(){return Array.from(document.querySelectorAll<HTMLElement>("#channels .opportunity-channel-card")).find(card=>text(card.querySelector(".asset-select strong"))==="Pinterest")??null;}
function builderContext(){
  const step1=document.querySelector<HTMLElement>(".campaign-details-card");
  const detailInputs=step1?Array.from(step1.querySelectorAll<HTMLInputElement>("input")):[];
  const campaignName=detailInputs.find(i=>i.type!=="date")?.value.trim()??"";
  const skus=Array.from(document.querySelectorAll<HTMLTableRowElement>(".campaign-table tbody tr")).filter(r=>r.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(r=>text(r.querySelector("td:nth-child(2) small"))).filter(Boolean);
  const messaging=Array.from(document.querySelectorAll<HTMLElement>(".campaign-stage-panel")).find(p=>text(p.querySelector("h2")).includes("Edit and approve the campaign messaging"));
  const mInputs=messaging?Array.from(messaging.querySelectorAll<HTMLInputElement>("input")):[];
  const areas=messaging?Array.from(messaging.querySelectorAll<HTMLTextAreaElement>("textarea")):[];
  const card=findPinterestCard();
  const labels=card?Array.from(card.querySelectorAll<HTMLElement>(".opportunity-option")).filter(o=>o.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).map(o=>text(o.querySelector("strong")).replace(/Paid$/,"" ).trim()).filter(Boolean):[];
  return{campaignName,productSkus:skus,headline:mInputs[0]?.value??"",cta:mInputs[1]?.value??"",description:areas[0]?.value??"",selectedLabels:labels};
}

export default function PinterestCampaignOpportunityBridge(){
  const pathname=usePathname();
  const[target,setTarget]=useState<HTMLElement|null>(null),[boards,setBoards]=useState<Board[]>([]),[configured,setConfigured]=useState<boolean|null>(null),[boardId,setBoardId]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false),[previews,setPreviews]=useState<PinPreview[]>([]);

  useEffect(()=>{
    if(pathname!=="/campaigns")return;
    let cancelled=false;
    const attach=()=>{
      const card=findPinterestCard();
      const active=!!card?.querySelector<HTMLInputElement>('.asset-select input[type="checkbox"]')?.checked;
      if(!card||!active){if(!cancelled)setTarget(null);return;}
      let mount=card.querySelector<HTMLElement>("#pinterest-campaign-opportunity-workbench");
      if(!mount){mount=document.createElement("div");mount.id="pinterest-campaign-opportunity-workbench";card.appendChild(mount)}
      if(!cancelled)setTarget(mount);
    };
    attach();
    const observer=new MutationObserver(attach);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","checked"]});
    document.addEventListener("change",attach,true);
    return()=>{cancelled=true;observer.disconnect();document.removeEventListener("change",attach,true)};
  },[pathname]);

  async function loadBoards(){
    try{const r=await fetch("/api/integrations/pinterest/boards",{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to load Pinterest boards.");setConfigured(Boolean(d.configured));setBoards((d.boards??[]) as Board[]);setBoardId(current=>current||String(d.boards?.[0]?.id??""));}
    catch(e){setConfigured(false);setStatus(e instanceof Error?e.message:"Unable to load Pinterest connection.")}
  }
  useEffect(()=>{if(target)void loadBoards()},[target]);

  const ctx=target?builderContext():{campaignName:"",productSkus:[],headline:"",cta:"",description:"",selectedLabels:[]};
  const selectedSupported=useMemo(()=>ctx.selectedLabels.filter(l=>supported[l]).map(l=>({label:l,id:supported[l]})),[ctx.selectedLabels.join("|")]);
  const selectedPaid=ctx.selectedLabels.filter(l=>paidLabels.has(l));

  async function createBoard(){
    if(!ctx.campaignName.trim())return setStatus("Give the campaign a name before creating its Pinterest board.");
    setBusy(true);setStatus("Creating Pinterest campaign board…");
    try{const r=await fetch("/api/integrations/pinterest/boards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:ctx.campaignName,description:ctx.description})}),d=await r.json();if(!r.ok)throw new Error(d.message||"Unable to create Pinterest board.");await loadBoards();if(d.id)setBoardId(String(d.id));setStatus(`Pinterest board “${d.name??ctx.campaignName}” created and selected.`)}catch(e){setStatus(e instanceof Error?e.message:"Unable to create Pinterest board.")}finally{setBusy(false)}
  }

  async function prepare(action:"preview"|"publish"){
    if(!boardId)return setStatus("Choose a Pinterest board first.");
    if(!ctx.productSkus.length)return setStatus("Select at least one campaign product in Card 2 first.");
    if(!selectedSupported.length)return setStatus("Select Organic Product Pins, Seasonal / Theme Board Push, or Inspirational / Lifestyle Pins first.");
    if(action==="publish"&&!previews.length)return setStatus("Preview the Pinterest package before publishing it.");
    if(action==="publish"&&!window.confirm(`Publish ${previews.length} Pinterest campaign Pin${previews.length===1?"":"s"} now?`))return;
    setBusy(true);setStatus(action==="preview"?"Preparing Pinterest campaign package…":"Publishing approved Pinterest Pins…");
    try{
      const all:PinPreview[]=[];
      for(const opportunity of selectedSupported){
        const r=await fetch("/api/integrations/pinterest/campaign-pins",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,boardId,productSkus:ctx.productSkus,campaignName:ctx.campaignName,headline:ctx.headline,description:ctx.description,cta:ctx.cta,opportunityId:opportunity.id})}),d=await r.json();
        if(!r.ok)throw new Error(d.message||"Pinterest campaign operation failed.");
        if(action==="preview")all.push(...(d.items??[]));
      }
      if(action==="preview"){setPreviews(all);setStatus(`${all.length} Pinterest Pin${all.length===1?"":"s"} prepared for review. Nothing has been published.`)}else{setPreviews([]);setStatus("Pinterest campaign Pins published successfully. Refreshing board data…");await loadBoards();}
    }catch(e){setStatus(e instanceof Error?e.message:"Pinterest campaign operation failed.")}finally{setBusy(false)}
  }

  if(pathname!=="/campaigns"||!target)return null;
  return createPortal(<section style={{marginTop:14,padding:14,border:"1px solid #cfd9c9",borderRadius:12,background:"#f8fbf6",display:"grid",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><strong style={{fontSize:15}}>Pinterest Opportunity Workbench</strong><div style={{fontSize:12,marginTop:3,opacity:.78}}>Campaign selections → Pinterest board → preview → explicit publish</div></div><span style={{fontSize:12,fontWeight:900,padding:"5px 8px",borderRadius:999,background:configured?"#e2f3e5":"#fff1d6"}}>{configured===null?"Checking connection…":configured?"✓ Pinterest connected":"Pinterest publishing not connected"}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(220px,1fr) auto",gap:8,alignItems:"end"}}><label style={{display:"grid",gap:5,fontSize:12,fontWeight:800}}>Destination board<select value={boardId} onChange={e=>{setBoardId(e.target.value);setPreviews([])}} style={{height:40,border:"1px solid #aebca8",borderRadius:8,padding:"0 10px",background:"white"}}><option value="">Choose board…</option>{boards.map(b=><option value={b.id} key={b.id}>{b.name}{typeof b.pinCount==="number"?` · ${b.pinCount} pins`:""}</option>)}</select></label><button type="button" disabled={busy||!configured} onClick={createBoard} style={{height:40}}>Create Campaign Board</button></div>
    <div style={{fontSize:12,lineHeight:1.5}}><strong>{ctx.productSkus.length}</strong> campaign product{ctx.productSkus.length===1?"":"s"} · <strong>{selectedSupported.length}</strong> organic Pinterest opportunit{selectedSupported.length===1?"y":"ies"} selected{selectedPaid.length?` · ${selectedPaid.length} paid opportunity currently gated`:""}</div>
    {selectedPaid.length>0&&<div style={{padding:"8px 10px",background:"#fff6e2",borderRadius:8,fontSize:12}}><strong>Paid Pinterest:</strong> {selectedPaid.join(", ")} will remain gated until the Pinterest Ads account/permissions are connected. Organic publishing can proceed independently.</div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" disabled={busy||!boardId||!selectedSupported.length} onClick={()=>prepare("preview")}>{busy?"Working…":"Preview Pinterest Package"}</button><button type="button" disabled={busy||!configured||!previews.length} onClick={()=>prepare("publish")}>Publish Previewed Pins Now</button></div>
    {status&&<div style={{padding:"8px 10px",background:"white",borderRadius:8,fontSize:12}}>{status}</div>}
    {previews.length>0&&<div style={{display:"grid",gap:8,maxHeight:330,overflowY:"auto"}}>{previews.map((p,i)=><article key={`${p._meta?.opportunityId}:${p._meta?.sku}:${i}`} style={{display:"grid",gridTemplateColumns:"72px 1fr",gap:10,padding:9,background:"white",border:"1px solid #e0e6dc",borderRadius:9}}><img src={p.media_source.url} alt="" style={{width:72,height:96,objectFit:"cover",borderRadius:7}}/><div style={{minWidth:0}}><strong style={{display:"block",fontSize:13}}>{p.title}</strong><small style={{display:"block",marginTop:3}}>{p._meta?.productName??p._meta?.sku} · {p._meta?.opportunityId}</small><p style={{fontSize:12,margin:"6px 0",lineHeight:1.35}}>{p.description}</p><small style={{wordBreak:"break-all"}}>{p.link}</small></div></article>)}</div>}
  </section>,target);
}
