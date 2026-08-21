import { NextResponse } from "next/server";
import { SellerchampClient } from "@/lib/integrations/sellerchamp/client";

export async function GET() {
  try {
    const client = new SellerchampClient();
    const result = await client.getMarketplaceAccounts();

    return NextResponse.json({
      connected: true,
      marketplaceAccountCount: result.marketplace_accounts?.length ?? 0,
      marketplaceAccounts: (result.marketplace_accounts ?? []).map((account) => ({
        id: account.id,
        name: account.name ?? null,
        type: account.marketplace_account_type ?? account.type ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown Sellerchamp connection error",
      },
      { status: 503 },
    );
  }
}
