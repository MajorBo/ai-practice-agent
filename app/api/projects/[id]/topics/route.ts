import { NextResponse } from "next/server";
import { generateTopicCandidates } from "@/lib/aiService";
import type { ProjectInput, ProjectRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: ProjectRecord };
    const project = body.project;

    if (!project) {
      return NextResponse.json({ error: "请在请求中提供项目上下文" }, { status: 400 });
    }

    const projectInput: ProjectInput = {
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

    const topics = await generateTopicCandidates(projectInput);

    return NextResponse.json({
      ...project,
      topics,
      selectedTopic: null,
      researchPlan: null,
      stage: "选题设计",
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "选题生成失败" }, { status: 500 });
  }
}
