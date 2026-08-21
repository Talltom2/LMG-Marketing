import type { CommerceAdapter, ProductCommerceRecord } from "./types";

export class SellerchampAdapter implements CommerceAdapter {
  name = "sellerchamp";

  async fetchProductPerformance(startDate: Date, endDate: Date): Promise<ProductCommerceRecord[]> {
    // Integration transport intentionally deferred until Sellerchamp's available
    // API/export mechanism is confirmed. The normalized contract is established now
    // so the rest of LMG Marketing Intelligence is not coupled to vendor-specific data.
    void startDate;
    void endDate;
    return [];
  }
}
