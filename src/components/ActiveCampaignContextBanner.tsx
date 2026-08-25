"use client";

import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";

type Campaign={id:string;name:string;status:string};
const ACTIVE_KEY="lmg-active-campaign-id";

export default function ActiveCampaignContextBanner(){
 const pathname=usePathname();
 const[campaign,setCampaign]=useState<Campaign|null>(null);
 const show=pathname==="/promotional-assets"||pathname==="/campaigns/execution";
 useEffect(()=>{
  if(!show)return;
  const load=async(id?:string)=>{
    const wanted=id||(()=>{try{return localStorage.getItem(ACTIVE_KEY)||""}catch{return""}})();
    if(!wanted){setCampaign(null);return}
    try{const r=await fetch("/api/campaigns",{cache:"no-store"}),d=await r.json(),c=(d.campaigns??[]).find((x:Campaign)=>x.id===wanted);setCampaign(c??null)}catch{setCampaign(null)}
  };
  void load();
  const event=(e:Event)=>{const detail=(e as CustomEvent<{id?:string}>).detail;void load(detail?.id)};
  window.addEventListener("lmg-active-campaign-change",event);
  return()=>window.removeEventListener("lmg-active-campaign-change",event);
 },[show,pathname]);
 if(!show)return null;
 return <section style={{maxWidth:1180,margin:"12px auto 8px",padding:"15px 20px",borderRadius:14,background:"#183b24",color:"white",boxShadow:"0 8px 24px rgba(25,55,35,.16)"}}>
  <div style={{fontSize:12,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",opacity:.78}}>Current campaign</div>
  <div style={{fontSize:27,fontWeight:900,marginTop:3}}>{campaign?.name??"No campaign selected"}</div>
  <div style={{fontSize:13,marginTop:4,opacity:.82}}>{campaign?`${campaign.status} · Return to Build to change campaigns or continue editing.`:"Choose or save a campaign on Build first."}</div>
 </section>;
}
