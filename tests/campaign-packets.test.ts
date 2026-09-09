import assert from "node:assert/strict";
import test from "node:test";
import {buildCampaignBrief,buildPerformancePacket} from "../src/lib/campaign-packets.ts";

test("campaign brief contains required readable and structured handoff facts",()=>{
 const result=buildCampaignBrief({id:"campaign-test",name:"Test Campaign",objective:"Increase attributable revenue",offer:"10% off",startDate:"2026-10-01T00:00:00.000Z",endDate:"2026-10-14T00:00:00.000Z",budget:125,channels:["WOOCOMMERCE","PINTEREST"],deliverables:{WOOCOMMERCE:["Homepage feature"],PINTEREST:["Organic product Pin"]},products:[{sku:"SKU-1",name:"Rustic Rooster",description:"Metal centerpiece",price:39.95,inventory:12,url:"https://example.test/rooster",images:["https://example.test/rooster.jpg"],historical:{units:8,revenue:319.6}}],campaignHistory:[{name:"Prior Fall"}],previousLearnings:["Homepage traffic converted well."]});
 assert.equal(result.json.id,"campaign-test");assert.match(result.markdown,/ChatGPT Campaign Brief: Test Campaign/);assert.match(result.markdown,/Rustic Rooster \(SKU-1\)/);assert.match(result.markdown,/\$39\.95/);assert.match(result.markdown,/Homepage traffic converted well/);
});

test("performance packet keeps facts, baselines, health, and instructions separate",()=>{
 const result=buildPerformancePacket({campaign:{id:"campaign-test",name:"Test Campaign"},summary:{revenue:80,sessions:100},baseline:{revenue:100,sessions:80},channels:[{name:"Website",revenue:80}],products:[{sku:"SKU-1",revenue:80}],dataHealth:[{title:"Pinterest sync is stale",detail:"Last sync exceeded 48 hours."}],factualAnomalies:[{title:"Revenue changed 20%",evidence:"Current 80; baseline 100."}],priorActions:[]});
 assert.equal(result.json.summary.revenue,80);assert.match(result.markdown,/Objective data-health findings/);assert.match(result.markdown,/Pinterest sync is stale/);assert.match(result.markdown,/separate facts from hypotheses/);
});
