export type ApprovalState="DRAFT"|"IN_REVIEW"|"APPROVED"|"REJECTED";
export type PublicationState="UNSCHEDULED"|"SCHEDULED"|"PUBLISHING"|"PUBLISHED"|"FAILED"|"CANCELLED";

export function importedContentState(){return{approvalStatus:"DRAFT" as ApprovalState,publicationStatus:"UNSCHEDULED" as PublicationState,approvedAt:null,scheduledAt:null,publishedAt:null,adapterConfirmation:null}}
export function canScheduleContent(approvalStatus:ApprovalState){return approvalStatus==="APPROVED"}
export function canRecordPublication(approvalStatus:ApprovalState,confirmationNote:string){return approvalStatus==="APPROVED"&&confirmationNote.trim().length>0}
export function executionMode(channel:string){if(channel==="WOOCOMMERCE")return"WORDPRESS_ADAPTER" as const;if(channel==="PINTEREST")return"PINTEREST_ADAPTER" as const;return"MANUAL_TASK" as const}
