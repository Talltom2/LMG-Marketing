"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import LmgTopNav from "@/components/LmgTopNav";
import {opportunityCatalog,type PromotionalOpportunity} from "@/app/campaigns/opportunities";

const LEGACY_STORAGE_KEY="lmg-promotional-asset-library-v1";

const assetMeta:Record<string,{label:string;description:string}>={
  WEBSITE_HOMEPAGE:{label:"Website Homepage",description:"Homepage campaign placements and merchandising modules."},
  WOOCOMMERCE:{label:"WooCommerce Store",description:"Store landing pages, merchandising and onsite promotional treatments."},
  PINTEREST:{label:"Pinterest",description:"Organic Pins, boards, paid promotion and retargeting."},
  TIKTOK:{label:"TikTok",description:"Organic video, product showcase, Shop/catalog and paid media."},
  META:{label:"Facebook / Instagram",description:"Organic social, Reels/Stories, catalog ads and retargeting."},
  BING:{label:"Bing / Microsoft Ads",description:"Shopping, search and Microsoft Audience advertising."},
  WALMART_MARKETPLACE:{label:"Walmart Marketplace",description:"Marketplace merchandising, listing and promotional opportunities."},
  WALMART_ADS:{label:"Walmart Connect Ads",description:"Paid Walmart advertising opportunities."},
  AMAZON_US:{label:"Amazon US Marketplace",description:"Amazon US marketplace merchandising and promotions."},
  AMAZON_ADS:{label:"Amazon Ads",description:"Sponsored Products and Sponsored Brands opportunities."},
  AMAZON_CA:{label:"Amazon Canada Marketplace",description:"Amazon Canada marketplace merchandising and promotions."},
  EMAIL:{label:"Email",description:"Customer-list, buyer-segment and lifecycle email opportunities."},
};

type EditableOpportunity=PromotionalOpportunity&{enabled?:boolean;creativeRequirements?:string;recommendationRule?:string};
type LibraryState=Record<string,{enabled:boolean;description:string;opportunities:EditableOpportunity[]}>;
type ConnectionField={key:string;label:string;secret:boolean;configured:boolean;display:string};
type ConnectionStatus={asset:string;label:string;configured:boolean;partial:boolean;fields:ConnectionField[]};

function initialLibrary():LibraryState{
  return Object.fromEntries(Object.entries(assetMeta).map(([asset,meta])=>[asset,{enabled:true,description:meta.description,opportunities:(opportunityCatalog[asset]??[]).map(o=>({...o,enabled:true,creativeRequirements:"",recommendationRule:o.recommendedFor?.length?`Recommend for: ${o.recommendedFor.join(", ")}`:"Available when strategically appropriate."}))}])) as LibraryState;
}

export default function PromotionalAssetsPage(){
  const[library,setLibrary]=useState<LibraryState>(()=>initialLibrary());
  const[selectedAsset,setSelectedAsset]=useState("PINTEREST");
  const[connections,setConnections]=useState<ConnectionStatus[]>([]);
  const[message,setMessage]=useState("Loading persistent asset library…");
  const[search,setSearch]=useState("");
  const[loaded,setLoaded]=useState(false);
  const[updatedAt,setUpdatedAt]=useState<string|null>(null);
  const saveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  async function persist(next:LibraryState,notice="Changes saved to LMG Marketing."){
    try{
      const r=await fetch("/api/admin/promotional-assets",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({library:next})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Unable to save promotional asset library.");
      setUpdatedAt(d.updatedAt??new Date().toISOString());
      setMessage(notice);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to save promotional asset library.")}
  }

  function queueSave(next:LibraryState){
    setLibrary(next);
    setMessage("Saving changes…");
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>void persist(next),500);
  }

  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      try{
        const r=await fetch("/api/admin/promotional-assets",{cache:"no-store"});
        const d=await r.json();
        if(!r.ok)throw new Error(d.error||"Unable to load promotional asset library.");
        if(cancelled)return;
        setConnections(d.assets??[]);
        if(d.library){
          setLibrary(d.library as LibraryState);
          setUpdatedAt(d.updatedAt??null);
          setMessage("Persistent asset library loaded from Neon.");
        }else{
          let starting=initialLibrary();
          let migrated=false;
          try{
            const legacy=localStorage.getItem(LEGACY_STORAGE_KEY);
            if(legacy){starting=JSON.parse(legacy) as LibraryState;migrated=true;}
          }catch{}
          setLibrary(starting);
          await persist(starting,migrated?"Browser asset edits migrated into Neon.":"Default asset library initialized in Neon.");
          try{localStorage.removeItem(LEGACY_STORAGE_KEY);}catch{}
        }
      }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Unable to load promotional asset library.")}
      finally{if(!cancelled)setLoaded(true)}
    })();
    return()=>{cancelled=true;if(saveTimer.current)clearTimeout(saveTimer.current)};
  },[]);

  function patchAsset(asset:string,patch:Partial<LibraryState[string]>){queueSave({...library,[asset]:{...library[asset],...patch}})}
  function patchOpportunity(asset:string,id:string,patch:Partial<EditableOpportunity>){const current=library[asset];patchAsset(asset,{opportunities:current.opportunities.map(o=>o.id===id?{...o,...patch}:o)})}
  function addOpportunity(asset:string){const current=library[asset];const id=`custom-${Date.now()}`;patchAsset(asset,{opportunities:[...current.opportunities,{id,label:"New Opportunity",description:"Describe this promotional opportunity.",audience:"Define audience",timingOffsetDays:0,paid:false,recommendedFor:[],enabled:true,creativeRequirements:"",recommendationRule:""}]})}
  function deleteOpportunity(asset:string,id:string){const current=library[asset];patchAsset(asset,{opportunities:current.opportunities.filter(o=>o.id!==id)})}
  function resetLibrary(){const fresh=initialLibrary();setLibrary(fresh);void persist(fresh,"Asset library restored to system defaults and saved in Neon.")}

  const assetKeys=useMemo(()=>Object.keys(assetMeta).filter(k=>{const q=search.trim().toLowerCase();return !q||assetMeta[k].label.toLowerCase().includes(q)||library[k]?.description.toLowerCase().includes(q)}),[search,library]);
  const current=library[selectedAsset]??initialLibrary()[selectedAsset];
  const connection=connections.find(c=>c.asset===selectedAsset);

  return <main className="asset-admin-shell">
    <LmgTopNav active="/promotional-assets"/>
    <section className="asset-admin-header"><div><p className="eyebrow">LMG Marketing Administration</p><h1>Promotional Asset Library & Connections</h1><p>Define what LMG Marketing can do, when each opportunity should be recommended, and whether the underlying platform connection is ready.</p><small>{loaded?(updatedAt?`Persistent library · last saved ${new Date(updatedAt).toLocaleString()}`:"Persistent library ready"):"Loading persistent library…"}</small></div><button className="button-muted" onClick={resetLibrary} disabled={!loaded}>Restore defaults</button></section>

    <div className="asset-admin-layout">
      <aside className="asset-admin-list"><input type="search" placeholder="Find promotional asset" value={search} onChange={e=>setSearch(e.target.value)}/>{assetKeys.map(asset=>{const item=library[asset],conn=connections.find(c=>c.asset===asset);return <button key={asset} className={`asset-admin-list-item ${selectedAsset===asset?"active":""}`} onClick={()=>setSelectedAsset(asset)}><span><strong>{assetMeta[asset].label}</strong><small>{item?.opportunities.filter(o=>o.enabled!==false).length??0} active opportunities</small></span><b className={conn?.configured?"connection-dot green":conn?.partial?"connection-dot yellow":"connection-dot gray"}/></button>})}</aside>

      <section className="asset-admin-main">
        <div className="asset-editor-card"><div className="asset-editor-heading"><div><p className="eyebrow">Promotional asset</p><h2>{assetMeta[selectedAsset].label}</h2></div><label className="asset-toggle"><input type="checkbox" checked={current.enabled} onChange={e=>patchAsset(selectedAsset,{enabled:e.target.checked})}/> Active</label></div><label>Description<textarea rows={3} value={current.description} onChange={e=>patchAsset(selectedAsset,{description:e.target.value})}/></label></div>

        <section className="asset-editor-card"><div className="asset-section-heading"><div><p className="eyebrow">Opportunities</p><h2>Available executions</h2></div><button className="primary-button" onClick={()=>addOpportunity(selectedAsset)}>＋ Add Opportunity</button></div><p className="asset-help">Every opportunity is editable. Disable one to hide it from future campaign selection without deleting it. Changes are saved persistently to Neon.</p><div className="opportunity-admin-list">{current.opportunities.map(o=><article className={`opportunity-admin-card ${o.enabled===false?"disabled":""}`} key={o.id}><div className="opportunity-admin-head"><label><input type="checkbox" checked={o.enabled!==false} onChange={e=>patchOpportunity(selectedAsset,o.id,{enabled:e.target.checked})}/> <strong>{o.label}</strong></label><button className="button-muted" onClick={()=>deleteOpportunity(selectedAsset,o.id)}>Delete</button></div><div className="opportunity-admin-grid"><label>Name<input value={o.label} onChange={e=>patchOpportunity(selectedAsset,o.id,{label:e.target.value})}/></label><label>Audience<input value={o.audience} onChange={e=>patchOpportunity(selectedAsset,o.id,{audience:e.target.value})}/></label><label>Timing offset (days)<input type="number" value={o.timingOffsetDays} onChange={e=>patchOpportunity(selectedAsset,o.id,{timingOffsetDays:Number(e.target.value)})}/></label><label>Type<select value={o.paid?"paid":"organic"} onChange={e=>patchOpportunity(selectedAsset,o.id,{paid:e.target.value==="paid"})}><option value="organic">Organic / owned</option><option value="paid">Paid media</option></select></label><label className="wide">Description<textarea rows={3} value={o.description} onChange={e=>patchOpportunity(selectedAsset,o.id,{description:e.target.value})}/></label><label className="wide">Recommendation rule<textarea rows={2} value={o.recommendationRule??""} onChange={e=>patchOpportunity(selectedAsset,o.id,{recommendationRule:e.target.value})}/></label><label className="wide">Creative requirements<textarea rows={2} value={o.creativeRequirements??""} onChange={e=>patchOpportunity(selectedAsset,o.id,{creativeRequirements:e.target.value})} placeholder="Example: 1000×1500 image, title under 100 characters, product URL, seasonal board assignment"/></label></div></article>)}</div></section>

        <section className="asset-editor-card"><div className="asset-section-heading"><div><p className="eyebrow">Connection / API</p><h2>Execution readiness</h2></div><span className={connection?.configured?"connection-badge connected":connection?.partial?"connection-badge partial":"connection-badge"}>{connection?.configured?"Connected":connection?.partial?"Partially configured":"Not connected"}</span></div><p className="asset-help">Secret values are never shown in the application. This page reports whether each deployment credential exists; secret replacement remains protected in deployment environment settings.</p>{connection?.fields.length?<div className="connection-field-list">{connection.fields.map(f=><div className="connection-field-row" key={f.key}><div><strong>{f.label}</strong><small>{f.key}</small></div><span>{f.display}</span></div>)}</div>:<div className="connection-empty"><strong>No credential mapping defined yet.</strong><p>Add this platform's API connection when its integration adapter is implemented.</p></div>}</section>
        {message&&<p className="status-message"><strong>{message}</strong></p>}
      </section>
    </div>
  </main>;
}
