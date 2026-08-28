"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const INSTANCE_KEY="lmg-campaign-instance-v1";

export default function CampaignExecutionInstanceBridge(){
  const pathname=usePathname();
  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    const sync=()=>{
      try{
        const id=localStorage.getItem(ACTIVE_KEY)||"";
        const desired=id?`campaign:${id}`:"";
        const current=sessionStorage.getItem(INSTANCE_KEY)||"";
        if(desired){if(current!==desired)sessionStorage.setItem(INSTANCE_KEY,desired)}
        else if(current)sessionStorage.removeItem(INSTANCE_KEY);
      }catch{}
    };
    sync();
    const timer=window.setInterval(sync,200);
    return()=>window.clearInterval(timer);
  },[pathname]);
  return null;
}
