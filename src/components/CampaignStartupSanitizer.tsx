"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const ACTIVE_KEY="lmg-active-campaign-id";

/**
 * Neutralize obsolete demo/default campaign state only when there is no
 * deliberately selected campaign. If ACTIVE_KEY or RESUME_KEY exists, the
 * current campaign must survive reloads and navigation back to Build.
 */
export default function CampaignStartupSanitizer(){
  const pathname=usePathname();

  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{
      const isDeliberateResume=!!localStorage.getItem(RESUME_KEY);
      const hasActiveCampaign=!!localStorage.getItem(ACTIVE_KEY);
      if(isDeliberateResume||hasActiveCampaign)return;

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
