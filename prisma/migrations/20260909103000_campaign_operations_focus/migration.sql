-- Narrow LMG Marketing to campaign operations and measurement.
CREATE TYPE "ContentApprovalStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "PublicationStatus" AS ENUM ('UNSCHEDULED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

ALTER TABLE "Campaign"
  ADD COLUMN "offer" TEXT,
  ADD COLUMN "budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "channels" JSONB,
  ADD COLUMN "workflowStage" TEXT NOT NULL DEFAULT 'DEFINITION',
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "CampaignContentAsset" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "deliverable" TEXT NOT NULL,
  "headline" TEXT,
  "bodyCopy" TEXT,
  "cta" TEXT,
  "destinationUrl" TEXT,
  "imageReference" TEXT,
  "notes" TEXT,
  "trackingParameters" JSONB,
  "approvalStatus" "ContentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'UNSCHEDULED',
  "adapter" TEXT,
  "adapterConfirmation" JSONB,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignContentAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignFollowUpAction" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CHATGPT',
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "dueAt" TIMESTAMP(3),
  "result" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignFollowUpAction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignCloseout" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "decision" TEXT,
  "result" TEXT,
  "learnings" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCloseout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignContentAsset_campaignId_channel_deliverable_key" ON "CampaignContentAsset"("campaignId", "channel", "deliverable");
CREATE INDEX "CampaignContentAsset_campaignId_approvalStatus_idx" ON "CampaignContentAsset"("campaignId", "approvalStatus");
CREATE INDEX "CampaignContentAsset_scheduledAt_publicationStatus_idx" ON "CampaignContentAsset"("scheduledAt", "publicationStatus");
CREATE INDEX "CampaignFollowUpAction_campaignId_status_idx" ON "CampaignFollowUpAction"("campaignId", "status");
CREATE UNIQUE INDEX "CampaignCloseout_campaignId_key" ON "CampaignCloseout"("campaignId");
ALTER TABLE "CampaignContentAsset" ADD CONSTRAINT "CampaignContentAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignFollowUpAction" ADD CONSTRAINT "CampaignFollowUpAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCloseout" ADD CONSTRAINT "CampaignCloseout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
