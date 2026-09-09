import assert from "node:assert/strict";import test from "node:test";
import {canRecordPublication,canScheduleContent,executionMode,importedContentState} from "../src/lib/content-lifecycle.ts";
import {buildCampaignBrief,buildPerformancePacket} from "../src/lib/campaign-packets.ts";

test("one test campaign completes the non-publishing operations lifecycle",()=>{
 const brief=buildCampaignBrief({id:"lifecycle-1",name:"Lifecycle Test",objective:"Measure a controlled promotion",offer:"Free shipping",startDate:"2026-10-01",endDate:"2026-10-07",budget:0,channels:["WOOCOMMERCE","META"],deliverables:{WOOCOMMERCE:["Homepage feature"],META:["Feed post"]},products:[{sku:"TEST-1",name:"Test Product",inventory:5,price:10}],campaignHistory:[],previousLearnings:[]});
 assert.match(brief.markdown,/Free shipping/);
 const imported=importedContentState();assert.equal(imported.approvalStatus,"DRAFT");assert.equal(canScheduleContent(imported.approvalStatus),false);assert.equal(canRecordPublication(imported.approvalStatus,"user confirmed"),false);
 const approved="APPROVED" as const;assert.equal(canScheduleContent(approved),true);assert.equal(executionMode("WOOCOMMERCE"),"WORDPRESS_ADAPTER");assert.equal(executionMode("META"),"MANUAL_TASK");assert.equal(canRecordPublication(approved,""),false);assert.equal(canRecordPublication(approved,"Recorded by campaign owner"),true);
 const performance=buildPerformancePacket({campaign:{id:"lifecycle-1",name:"Lifecycle Test",status:"COMPLETED"},summary:{revenue:120,units:12,sessions:100,purchases:10},baseline:{revenue:100,units:10,sessions:100,purchases:8},channels:[{name:"Website",revenue:120}],products:[{sku:"TEST-1",revenue:120}],dataHealth:[],factualAnomalies:[{title:"Revenue up 20%",evidence:"120 vs 100"}],priorActions:[{title:"Keep offer",status:"PROPOSED"}]});assert.match(performance.markdown,/Revenue up 20%/);assert.equal(performance.json.campaign.status,"COMPLETED");
});
