export type OpportunityClass = "GROWTH" | "CORRECTIVE" | "CAMPAIGN" | "MAINTENANCE";
export type AutomationLevel = "RECOMMEND" | "APPROVE_EXECUTE" | "AUTO_EXECUTE";

export type OpportunityInput = {
  expectedAnnualRevenue?: number;
  expectedAnnualProfit?: number;
  successProbability: number;
  urgency: number;
  effort: number;
  risk: number;
  confidence: number;
};

export function scoreOpportunity(input: OpportunityInput) {
  const economicValue = input.expectedAnnualProfit ?? (input.expectedAnnualRevenue ?? 0) * 0.35;
  const probability = Math.max(0, Math.min(1, input.successProbability));
  const confidence = Math.max(0.1, Math.min(1, input.confidence));
  const urgency = Math.max(1, input.urgency);
  const friction = Math.max(1, input.effort + input.risk);

  return Math.round((economicValue * probability * confidence * urgency) / friction);
}

export function priorityBand(score: number) {
  if (score >= 5000) return "DO NOW";
  if (score >= 1500) return "HIGH";
  if (score >= 500) return "MEDIUM";
  return "LOW";
}
