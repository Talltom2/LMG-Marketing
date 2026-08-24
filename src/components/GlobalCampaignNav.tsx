"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import LmgTopNav from "@/components/LmgTopNav";

export default function GlobalCampaignNav(){
  const pathname=usePathname();
  if(pathname!=="/campaigns"&&pathname!=="/campaigns/calendar")return null;
  return <div className="global-nav-wrap"><LmgTopNav active={pathname}/><div className="promotional-assets-nav-row"><Link href="/promotional-assets">Promotional Assets</Link></div></div>;
}
