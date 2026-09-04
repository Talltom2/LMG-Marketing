"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const SESSION_KEY="lmg-initial-dashboard-seen-v1";

export default function InitialDashboardRedirect(){
  const pathname=usePathname();

  useEffect(()=>{
    if(pathname.startsWith("/login"))return;
    try{
      if(sessionStorage.getItem(SESSION_KEY)==="1")return;
      sessionStorage.setItem(SESSION_KEY,"1");
      if(pathname!=="/")window.location.replace("/");
    }catch{
      if(pathname!=="/")window.location.replace("/");
    }
  },[pathname]);

  return null;
}
