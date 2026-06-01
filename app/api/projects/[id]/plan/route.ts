import { NextResponse } from "next/server";
import { generateResearchPlanWithAI, getAIProviderStatus } from "@/lib/ai/aiService";
import { mockPlan } from "@/lib/aiService";
import type { ProjectInput, ProjectRecord, ResearchPlanPayload, TopicCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GenerationSource = "ai" | "mock-missing-key" | "mock-api-error";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: ProjectRecord };
    const project = body.project;

    if (!project) return NextResponse.json({ error: "请在请求中提供项目上下文" }, { status: 400 });
    if (!project.selectedTopic) return NextResponse.json({ error: "请先确认主选题" }, { status: 400 });

    const projectInput: ProjectInput & { id: string } = {
      id: project.id,
      name: project.name,
      practiceType: project.practiceType,
      theme: project.theme,
      location: project.location,
      startDate: project.startDate.slice(0, 10),
      endDate: project.endDate.slice(0, 10),
      teamSize: project.teamSize,
      expectedOutcome: project.expectedOutcome,
      requirements: project.requirements || ""
    };
    const payload: ResearchPlanPayload = {
      project: projectInput,
      selectedTopic: project.selectedTopic as TopicCandidate
    };

    const status = getAIProviderStatus();
    const hasConfiguredKey = status.provider === "openai" ? status.hasOpenAIKey : status.hasDeepSeekKey;
    let generationSource: GenerationSource = "mock-missing-key";
    let researchPlan: string;

    if (!hasConfiguredKey) {
      researchPlan = mockPlan(payload);
    } else {
      try {
        const aiPlan = await generateResearchPlanWithAI(payload);
        if (aiPlan) {
          researchPlan = aiPlan;
          generationSource = "ai";
        } else {
          researchPlan = mockPlan(payload);
          generationSource = "mock-api-error";
        }
      } catch (error) {
        console.error("Falling back to mock research plan:", error);
        researchPlan = mockPlan(payload);
        generationSource = "mock-api-error";
      }
    }

    return NextResponse.json({
      ...project,
      researchPlan,
      stage: "方案已保存",
      updatedAt: new Date().toISOString(),
      generationSource
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "方案生成失败" }, { status: 500 });
  }
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: "SERVER_STORAGE_DISABLED",
      message: "当前 MVP 使用浏览器本地存储，方案保存请在前端 localStorage 完成。"
    },
    { status: 501 }
  );
}
