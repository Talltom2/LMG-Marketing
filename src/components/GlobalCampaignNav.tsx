"use client";
import {usePathname} from "next/navigation";
import LmgTopNav from "@/components/LmgTopNav";

export default function GlobalCampaignNav(){
  const pathname=usePathname();
  if(pathname.startsWith("/login"))return null;
  return <div className="global-nav-wrap"><LmgTopNav active={pathname} global/></div>;
}
