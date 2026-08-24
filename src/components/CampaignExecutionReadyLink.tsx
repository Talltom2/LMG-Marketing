"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function CampaignExecutionReadyLink(){
  const pathname=usePathname();
  if(pathname!=="/campaigns")return null;
  return <div style={{position:"fixed",right:20,bottom:20,zIndex:60}}>
    <Link href="/campaigns/execution" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"11px 14px",borderRadius:999,background:"#111827",color:"#fff",fontWeight:800,textDecoration:"none",boxShadow:"0 8px 24px rgba(0,0,0,.18)"}}>Execution Readiness →</Link>
  </div>;
}
