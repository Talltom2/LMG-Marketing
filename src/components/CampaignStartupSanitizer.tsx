"use client";

import {useLayoutEffect} from "react";
import {usePathname} from "next/navigation";

const LEARNING_DRAFT_KEY="lmg-campaign-learning-draft-v1";
const RESUME_KEY="lmg-campaign-exact-resume-v4";
const ACTIVE_KEY="lmg-active-campaign-id";
const SESSION_KEY="lmg-campaign-builder-session-v1";
const BLANK_KEY="lmg-campaign-builder-blank-v1";

/**
 * A new browser session starts with a blank campaign workspace. An explicit
 * campaign selection is honored only when it was initiated in the current
 * browser session. Refresh/navigation during that same session keeps the
 * selected campaign open.
 */
export default function CampaignStartupSanitizer(){
  const pathname=usePathname();

  useLayoutEffect(()=>{
    if(pathname!=="/campaigns")return;
    try{
      const sameBrowserSession=sessionStorage.getItem(SESSION_KEY)==="1";
      const deliberateResume=sameBrowserSession&&!!localStorage.getItem(RESUME_KEY);
      sessionStorage.setItem(SESSION_KEY,"1");

      if(deliberateResume){sessionStorage.removeItem(BLANK_KEY);return;}
      if(sameBrowserSession&&localStorage.getItem(ACTIVE_KEY)){sessionStorage.removeItem(BLANK_KEY);return;}

      // First builder visit of a new browser session: stale campaign pointers
      // must not silently reopen yesterday's campaign.
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(RESUME_KEY);
      sessionStorage.setItem(BLANK_KEY,"1");
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
