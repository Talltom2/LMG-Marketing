import Link from "next/link";
import PinterestProductList from "./PinterestProductList";
export const dynamic="force-dynamic";
export default function PinterestProductsPage(){return <main><header><p className="eyebrow">Laughing Moose Gifts · Pinterest</p><h1>Pinterest Product Summary</h1><p className="subtitle">Catalog → feed → inventory → distribution readiness → product health</p><p><Link href="/diagnostics/pinterest">← Pinterest Diagnostics</Link> · <Link href="/diagnostics">Diagnostic Center</Link> · <Link href="/diagnostics/pinterest-product">Open Product Workbench ↗</Link></p></header><PinterestProductList/></main>}
