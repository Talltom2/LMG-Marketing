import type {Metadata} from "next";
import InitialDashboardRedirect from "@/components/InitialDashboardRedirect";
import GlobalCampaignNav from "@/components/GlobalCampaignNav";
import PromotionalAssetsGlobalNav from "@/components/PromotionalAssetsGlobalNav";
import PromotionalAssetsNavInjector from "@/components/PromotionalAssetsNavInjector";
import CampaignCollectionPromoteFeedback from "@/components/CampaignCollectionPromoteFeedback";
import CampaignStartupSanitizer from "@/components/CampaignStartupSanitizer";
import CampaignBlankSessionGuard from "@/components/CampaignBlankSessionGuard";
import CampaignDraftPersistence from "@/components/CampaignDraftPersistence";
import CampaignProductSelectionPersistence from "@/components/CampaignProductSelectionPersistence";
import CampaignSelectionHighlighter from "@/components/CampaignSelectionHighlighter";
import ActiveCampaignContextBanner from "@/components/ActiveCampaignContextBanner";
import CampaignCalendarWindowGuard from "@/components/CampaignCalendarWindowGuard";
import CampaignExecutionInstanceBridge from "@/components/CampaignExecutionInstanceBridge";
import CampaignSchedulePersistence from "@/components/CampaignSchedulePersistence";
import CampaignVisualProductionBridge from "@/components/CampaignVisualProductionBridge";
import CampaignGeneratedVisualPersistence from "@/components/CampaignGeneratedVisualPersistence";
import CampaignVisualLibraryOrganizer from "@/components/CampaignVisualLibraryOrganizer";
import CampaignVisualApprovalPersistence from "@/components/CampaignVisualApprovalPersistence";
import CampaignOpportunitySelectionPersistence from "@/components/CampaignOpportunitySelectionPersistence";
import CampaignApprovedVisualPicker from "@/components/CampaignApprovedVisualPicker";
import CampaignOpportunityApprovalGuard from "@/components/CampaignOpportunityApprovalGuard";
import CampaignCreativeReviewPersistence from "@/components/CampaignCreativeReviewPersistence";
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
import "./campaign-startup.css";

export const metadata:Metadata={
  title:"LMG Marketing Intelligence",
  description:"Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><InitialDashboardRedirect/><GlobalCampaignNav/><ActiveCampaignContextBanner/><PromotionalAssetsGlobalNav/><PromotionalAssetsNavInjector/><CampaignCollectionPromoteFeedback/><CampaignStartupSanitizer/><CampaignBlankSessionGuard/><CampaignDraftPersistence/><CampaignProductSelectionPersistence/><CampaignSelectionHighlighter/><WooCommerceCampaignOpportunityBridge/><PinterestCampaignOpportunityBridge/><CampaignCalendarWindowGuard/><CampaignExecutionInstanceBridge/><CampaignSchedulePersistence/><CampaignVisualProductionBridge/><CampaignGeneratedVisualPersistence/><CampaignVisualLibraryOrganizer/><CampaignVisualApprovalPersistence/><CampaignOpportunitySelectionPersistence/><CampaignApprovedVisualPicker/><CampaignOpportunityApprovalGuard/><CampaignCreativeReviewPersistence/><CampaignBuilderSafeEnhancements/><HomepageScheduleServerSync/><CampaignExecutionReadyLink/>{children}</body></html>;
}
