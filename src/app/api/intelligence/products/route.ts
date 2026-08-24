import { NextRequest, NextResponse } from "next/server";
import { getProductIntelligence } from "@/lib/intelligence/products";
import { getWebsiteProductHealth } from "@/lib/integrations/woocommerce/product-health";
import { wooRequest, wooStoreRequest, woocommerceConfigured } from "@/lib/integrations/woocommerce/client";

type ImageRef={src:string};
type WooImageProduct={sku?:string;images?:ImageRef[]};

async function loadImages(){
  const bySku=new Map<string,{imageUrl:string|null;galleryUrls:string[]}>();
  try{
    for(let page=1;page<=100;page++){
      const rows=woocommerceConfigured()
        ? await wooRequest<WooImageProduct[]>("/products",{per_page:100,page,status:"publish"})
        : await wooStoreRequest<WooImageProduct[]>("/products",{per_page:100,page});
      for(const p of rows){const sku=String(p.sku??"").trim().toLowerCase();if(!sku)continue;const urls=(p.images??[]).map(i=>i.src).filter(Boolean);bySku.set(sku,{imageUrl:urls[0]??null,galleryUrls:urls.slice(1)});}
      if(rows.length<100)break;
    }
  }catch{}
  return bySku;
}

export async function GET(request: NextRequest) {
  try {
    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days") ?? 30), 1), 365);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const [intelligence, website, images] = await Promise.all([
      getProductIntelligence(startDate, endDate),
      getWebsiteProductHealth(),
      loadImages(),
    ]);

    const bySku = new Map(intelligence.map((product) => [product.sku.trim().toLowerCase(), product]));
    const products = website.products
      .filter((product) => String(product.sku ?? "").trim())
      .map((product) => {
        const sku = String(product.sku).trim();
        const existing = bySku.get(sku.toLowerCase());
        const imageData=images.get(sku.toLowerCase())??{imageUrl:null,galleryUrls:[]};
        return existing ? {...existing,...imageData} : {
          sku,
          name: product.name,
          units: 0,
          commerceRevenue: 0,
          productViews: 0,
          addToCarts: 0,
          checkoutStarts: 0,
          websitePurchases: 0,
          websiteRevenue: 0,
          viewToCartRate: 0,
          purchaseConversionRate: 0,
          signal: "INSUFFICIENT_DATA" as const,
          ...imageData,
        };
      })
      .sort((a, b) => {
        const signalRank = (value: string) => value === "PROMOTE" ? 0 : value === "FIX_CONVERSION" ? 1 : value === "WATCH" ? 2 : 3;
        return signalRank(a.signal) - signalRank(b.signal) || a.name.localeCompare(b.name);
      });

    return NextResponse.json({ startDate, endDate, days, products, catalogCount: products.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to calculate product intelligence" },
      { status: 500 },
    );
  }
}
