import type {Metadata} from "next";
import GlobalCampaignNav from "@/components/GlobalCampaignNav";
import "./globals.css";
import "./site-additions.css";

export const metadata:Metadata={
  title:"LMG Marketing Intelligence",
  description:"Marketing command center for Laughing Moose Gifts",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><GlobalCampaignNav/>{children}</body></html>;
}
