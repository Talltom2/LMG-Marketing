import type { FunnelAdapter, FunnelRecord } from "./types";

export class LmgAnalyticsAdapter implements FunnelAdapter {
  name = "lmg-analytics";

  async fetchFunnelPerformance(startDate: Date, endDate: Date): Promise<FunnelRecord[]> {
    // Endpoint details will be wired once we expose the plugin's reporting API.
    // Keeping this adapter vendor-specific prevents the application from depending
    // directly on WordPress internals.
    void startDate;
    void endDate;
    return [];
  }
}
