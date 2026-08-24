"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function PromotionalAssetsGlobalNav(){
  const pathname=usePathname();
  if(pathname.startsWith("/login"))return null;
  return <div className="promotional-assets-nav-row"><Link className={pathname==="/promotional-assets"?"active":""} href="/promotional-assets">Promotional Assets</Link></div>;
}
