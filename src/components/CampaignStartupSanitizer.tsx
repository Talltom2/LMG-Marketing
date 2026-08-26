"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const ACTIVE_KEY="lmg-active-campaign-id";

/**
 * Campaign Builder historically shipped with a populated demo/default campaign.
 * On a normal visit to /campaigns we must neutralize that client-side default
 * before CampaignBuilderPage's passive effect runs. A deliberate resume stores
 * RESUME_KEY first; in that case we leave the handoff payload untouched.
 */
export default function CampaignStartupSanitizer(){
  const pathname=usePathname();

  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{
      const isDeliberateResume=!!localStorage.getItem(RESUME_KEY);
      if(isDeliberateResume)return;

      localStorage.removeItem(ACTIVE_KEY);
      localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({
        name:" ",
        objective:" ",
        productSkus:["__NONE__"],
        channels:["__NONE__"],
        headline:" ",
        coreMessage:" ",
        cta:" ",
        learningSummary:"Blank campaign workspace"
      }));
    }catch{}
  },[pathname]);

  return null;
}
