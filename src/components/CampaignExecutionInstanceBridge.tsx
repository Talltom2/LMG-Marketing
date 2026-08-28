"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const ACTIVE_KEY="lmg-active-campaign-id";
const INSTANCE_KEY="lmg-campaign-instance-v1";

export default function CampaignExecutionInstanceBridge(){
  const pathname=usePathname();
  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{
      const id=localStorage.getItem(ACTIVE_KEY)||"";
      if(id)sessionStorage.setItem(INSTANCE_KEY,`campaign:${id}`);
      else sessionStorage.removeItem(INSTANCE_KEY);
    }catch{}
  },[pathname]);
  return null;
}
