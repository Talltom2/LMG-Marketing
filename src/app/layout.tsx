import type {Metadata} from "next";
import GlobalCampaignNav from "@/components/GlobalCampaignNav";
import PromotionalAssetsGlobalNav from "@/components/PromotionalAssetsGlobalNav";
import PromotionalAssetsNavInjector from "@/components/PromotionalAssetsNavInjector";
import CampaignCollectionPromoteFeedback from "@/components/CampaignCollectionPromoteFeedback";
import CampaignWooCommerceDefaults from "@/components/CampaignWooCommerceDefaults";
import CampaignDraftPersistence from "@/components/CampaignDraftPersistence";
import CampaignCalendarWindowGuard from "@/components/CampaignCalendarWindowGuard";
import CampaignVisualProductionBridge from "@/components/CampaignVisualProductionBridge";
import CampaignOpportunityApprovalGuard from "@/components/CampaignOpportunityApprovalGuard";
import CampaignVisualCardCollapse from "@/components/CampaignVisualCardCollapse";
import "./globals.css";
import "./site-additions.css";
import "./nav-bridge.css";
import "./opportunity-flags.css";
import "./visual-card-collapse.css";

export const metadata:Metadata={
  title:"LMG Marketing Intelligence",
  description:"Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><GlobalCampaignNav/><PromotionalAssetsGlobalNav/><PromotionalAssetsNavInjector/><CampaignCollectionPromoteFeedback/><CampaignWooCommerceDefaults/><CampaignDraftPersistence/><CampaignCalendarWindowGuard/><CampaignVisualProductionBridge/><CampaignOpportunityApprovalGuard/><CampaignVisualCardCollapse/>{children}</body></html>;
}
