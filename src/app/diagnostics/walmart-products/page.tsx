import Link from "next/link";
import WalmartProductHealthList from "../[channelId]/WalmartProductHealthList";
export const dynamic="force-dynamic";
export default function WalmartProducts(){return <main><header><p className="eyebrow">Walmart Intelligence</p><h1>Active Product Health</h1><p className="subtitle">Every active Walmart product → traffic light → diagnostic workbench → Fix Now</p><p><Link href="/diagnostics">← Diagnostic Center</Link> · <Link href="/diagnostics/product">Product Diagnostic Workbench</Link></p></header><WalmartProductHealthList/></main>}
