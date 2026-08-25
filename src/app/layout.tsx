import type {Metadata} from "next";
import GlobalCampaignNav from "@/components/GlobalCampaignNav";
import PromotionalAssetsGlobalNav from "@/components/PromotionalAssetsGlobalNav";
import PromotionalAssetsNavInjector from "@/components/PromotionalAssetsNavInjector";
import CampaignCollectionPromoteFeedback from "@/components/CampaignCollectionPromoteFeedback";
import CampaignWooCommerceDefaults from "@/components/CampaignWooCommerceDefaults";
import CampaignWorkspaceV2 from "@/components/CampaignWorkspaceV2";
import ActiveCampaignContextBanner from "@/components/ActiveCampaignContextBanner";
import CampaignCalendarWindowGuard from "@/components/CampaignCalendarWindowGuard";
import CampaignVisualProductionBridge from "@/components/CampaignVisualProductionBridge";
import CampaignOpportunityApprovalGuard from "@/components/CampaignOpportunityApprovalGuard";
import CampaignVisualCardCollapse from "@/components/CampaignVisualCardCollapse";
import HomepageScheduleServerSync from "@/components/HomepageScheduleServerSync";
import CampaignExecutionReadyLink from "@/components/CampaignExecutionReadyLink";
import "./globals.css";
import "./site-additions.css";
import "./nav-bridge.css";
import "./opportunity-flags.css";
import "./visual-card-collapse.css";
import "./schedule-preflight.css";
import "./dashboard-restore.css";

export const metadata:Metadata={
  title:"LMG Marketing Intelligence",
  description:"Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><GlobalCampaignNav/><ActiveCampaignContextBanner/><PromotionalAssetsGlobalNav/><PromotionalAssetsNavInjector/><CampaignCollectionPromoteFeedback/><CampaignWooCommerceDefaults/><CampaignWorkspaceV2/><CampaignCalendarWindowGuard/><CampaignVisualProductionBridge/><CampaignOpportunityApprovalGuard/><CampaignVisualCardCollapse/><HomepageScheduleServerSync/><CampaignExecutionReadyLink/>{children}</body></html>;
}
