"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const ACTIVE_KEY="lmg-active-campaign-id";
const SESSION_KEY="lmg-campaign-builder-session-v1";

/**
 * A new browser session starts with a blank campaign workspace. An explicit
 * campaign selection (RESUME_KEY) is honored, and an already-open campaign is
 * preserved on refresh/navigation during the same browser session.
 */
export default function CampaignStartupSanitizer(){
  const pathname=usePathname();

  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{
      const deliberateResume=!!localStorage.getItem(RESUME_KEY);
      const sameBrowserSession=sessionStorage.getItem(SESSION_KEY)==="1";
      sessionStorage.setItem(SESSION_KEY,"1");

      if(deliberateResume)return;
      if(sameBrowserSession&&localStorage.getItem(ACTIVE_KEY))return;

      localStorage.removeItem(ACTIVE_KEY);
      localStorage.setItem(LEARNING_DRAFT_KEY,JSON.stringify({
        name:"",
        objective:"",
        productSkus:[],
        channels:[],
        startDate:"",
        endDate:"",
        templateId:"",
        headline:"",
        coreMessage:"",
        cta:"",
        learningSummary:"Blank campaign workspace"
      }));
    }catch{}
  },[pathname]);

  return null;
}
