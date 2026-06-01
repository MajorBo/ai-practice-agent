import { NextResponse } from "next/server";
import { generateResearchPlanWithAI, getAIProviderStatus } from "@/lib/ai/aiService";
import { mockPlan } from "@/lib/aiService";
import { getProject, updateProject } from "@/lib/projectStore";
import type { ProjectInput, ResearchPlanPayload, TopicCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GenerationSource = "ai" | "mock-missing-key" | "mock-api-error";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const project = await getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.selectedTopic) {
      return NextResponse.json({ error: "请先确认主选题" }, { status: 400 });
    }

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

    const updated = await updateProject(params.id, {
      researchPlan,
      stage: "方案已保存"
    });

    return NextResponse.json({ ...updated, generationSource });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "方案生成失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as { markdown?: string };

    if (typeof body.markdown !== "string" || body.markdown.trim().length === 0) {
      return NextResponse.json({ error: "方案内容不能为空" }, { status: 400 });
    }

    const updated = await updateProject(params.id, {
      researchPlan: body.markdown,
      stage: "方案已保存"
    });

    if (!updated) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "方案保存失败" }, { status: 500 });
  }
}
