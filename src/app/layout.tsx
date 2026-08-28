import type {Metadata} from "next";
import GlobalCampaignNav from "@/components/GlobalCampaignNav";
import PromotionalAssetsGlobalNav from "@/components/PromotionalAssetsGlobalNav";
import PromotionalAssetsNavInjector from "@/components/PromotionalAssetsNavInjector";
import CampaignCollectionPromoteFeedback from "@/components/CampaignCollectionPromoteFeedback";
import CampaignStartupSanitizer from "@/components/CampaignStartupSanitizer";
import CampaignDraftPersistence from "@/components/CampaignDraftPersistence";
import CampaignSelectionHighlighter from "@/components/CampaignSelectionHighlighter";
import ActiveCampaignContextBanner from "@/components/ActiveCampaignContextBanner";
import CampaignCalendarWindowGuard from "@/components/CampaignCalendarWindowGuard";
import CampaignVisualProductionBridge from "@/components/CampaignVisualProductionBridge";
import CampaignVisualLibraryOrganizer from "@/components/CampaignVisualLibraryOrganizer";
import CampaignVisualApprovalPersistence from "@/components/CampaignVisualApprovalPersistence";
import CampaignOpportunitySelectionPersistence from "@/components/CampaignOpportunitySelectionPersistence";
import CampaignApprovedVisualPicker from "@/components/CampaignApprovedVisualPicker";
import CampaignOpportunityApprovalGuard from "@/components/CampaignOpportunityApprovalGuard";
import CampaignBuilderSafeEnhancements from "@/components/CampaignBuilderSafeEnhancements";
import HomepageScheduleServerSync from "@/components/HomepageScheduleServerSync";
import CampaignExecutionReadyLink from "@/components/CampaignExecutionReadyLink";
import PinterestCampaignOpportunityBridge from "@/components/PinterestCampaignOpportunityBridge";
import WooCommerceCampaignOpportunityBridge from "@/components/WooCommerceCampaignOpportunityBridge";
import "./globals.css";
import "./site-additions.css";
import "./nav-bridge.css";
import "./opportunity-flags.css";
import "./visual-library-organizer.css";
import "./approved-visual-picker.css";
import "./opportunity-collapse.css";
import "./schedule-preflight.css";
import "./dashboard-restore.css";
import "./campaign-selection.css";

export const metadata:Metadata={
  title:"LMG Marketing Intelligence",
  description:"Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><GlobalCampaignNav/><ActiveCampaignContextBanner/><PromotionalAssetsGlobalNav/><PromotionalAssetsNavInjector/><CampaignCollectionPromoteFeedback/><CampaignStartupSanitizer/><CampaignDraftPersistence/><CampaignSelectionHighlighter/><WooCommerceCampaignOpportunityBridge/><PinterestCampaignOpportunityBridge/><CampaignCalendarWindowGuard/><CampaignVisualProductionBridge/><CampaignVisualLibraryOrganizer/><CampaignVisualApprovalPersistence/><CampaignOpportunitySelectionPersistence/><CampaignApprovedVisualPicker/><CampaignOpportunityApprovalGuard/><CampaignBuilderSafeEnhancements/><HomepageScheduleServerSync/><CampaignExecutionReadyLink/>{children}</body></html>;
}
