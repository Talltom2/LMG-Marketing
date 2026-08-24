"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function PromotionalAssetsGlobalNav(){
  const pathname=usePathname();
  if(pathname.startsWith("/login"))return null;
  const active=pathname==="/promotional-assets";
  return <div style={{maxWidth:1540,margin:"-10px auto 14px",padding:"0 24px",display:"flex",justifyContent:"flex-end"}}><Link href="/promotional-assets" style={{display:"inline-block",padding:"8px 12px",borderRadius:10,textDecoration:"none",fontSize:13,fontWeight:800,border:active?"1px solid #111":"1px solid #cfd7cb",background:active?"#111":"#fff",color:active?"#fff":"#27562a",boxShadow:"0 3px 10px rgba(35,57,35,.06)"}}>Promotional Assets</Link></div>;
}
