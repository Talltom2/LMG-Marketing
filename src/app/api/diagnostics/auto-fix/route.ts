import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ["channelId", "channelName", "layer", "title", "observation", "likelyCause", "recommendation", "confidence"];
    for (const key of required) {
      if (body?.[key] == null || body?.[key] === "") {
        return NextResponse.json({ message: `Missing ${key}.` }, { status: 400 });
      }
    }

    const recommendation = await db.recommendation.create({
      data: {
        title: body.title,
        observation: body.observation,
        recommendation: body.recommendation,
        rationale: `${body.likelyCause} Confidence: ${Math.round(Number(body.confidence) * 100)}%. Channel: ${body.channelName}. Diagnostic layer: ${body.layer}.`,
        expectedImpact: "Correct the diagnosed issue and measure post-action performance against the prior baseline.",
        status: "APPROVED",
        priority: body.layer === "CATALOG_HEALTH" || body.layer === "CONVERSION" ? 2 : 3,
        decidedAt: new Date(),
        actions: {
          create: {
            actionType: "DIAGNOSTIC_AUTO_FIX",
            description: body.recommendation,
            executionTarget: `${body.channelName}:${body.channelId}:${body.layer}`,
          },
        },
      },
    });

    return NextResponse.json({
      queued: true,
      recommendationId: recommendation.id,
      message: "Approved and queued. LMG Marketing will execute automatically once that correction is supported by the connected channel adapter; until then it remains safely queued for execution.",
    });
  } catch (error) {
    console.error("Unable to queue diagnostic auto-fix", error);
    return NextResponse.json({ message: "Unable to queue the automatic correction." }, { status: 500 });
  }
}
