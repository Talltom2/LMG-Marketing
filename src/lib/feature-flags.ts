const enabled = (name: string) => process.env[name]?.trim().toLowerCase() === "true";

export const featureFlags = {
  internalAiCopy: enabled("FEATURE_INTERNAL_AI_COPY"),
  internalAiImages: enabled("FEATURE_INTERNAL_AI_IMAGES"),
  aiStrategy: enabled("FEATURE_AI_STRATEGY"),
  complexDiagnostics: enabled("FEATURE_COMPLEX_DIAGNOSTICS"),
  automaticCorrectiveActions: enabled("FEATURE_AUTOMATIC_CORRECTIVE_ACTIONS"),
} as const;

export function disabledFeatureResponse(label: string) {
  return {
    error: `${label} is disabled in the campaign-operations workflow.`,
    featureDisabled: true,
    nextStep: "Export the relevant ChatGPT packet, record the decision, and create an approved follow-up action.",
  };
}
