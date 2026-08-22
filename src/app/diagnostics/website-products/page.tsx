import Link from "next/link";
import WebsiteProductHealthList from "../[channelId]/WebsiteProductHealthList";

export const dynamic = "force-dynamic";

export default function WebsiteProductsPage(){
  return <main>
    <header>
      <p className="eyebrow">Laughing Moose Gifts Website</p>
      <h1>Website Product Summary</h1>
      <p className="subtitle">Published WooCommerce products · health · inventory · traffic · carts · sales · conversion evidence</p>
      <p><Link href="/diagnostics">← Diagnostic Center</Link> · <Link href="/diagnostics/website-product">Open Product Workbench ↗</Link></p>
    </header>
    <WebsiteProductHealthList/>
  </main>;
}
