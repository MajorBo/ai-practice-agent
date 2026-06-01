import { NextResponse } from "next/server";
import { generateResearchPlan } from "@/lib/aiService";
import { prisma } from "@/lib/prisma";
import type { ProjectInput, TopicCandidate } from "@/lib/types";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });

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
    startDate: project.startDate.toISOString().slice(0, 10),
    endDate: project.endDate.toISOString().slice(0, 10),
    teamSize: project.teamSize,
    expectedOutcome: project.expectedOutcome,
    requirements: project.requirements || ""
  };

  const researchPlan = await generateResearchPlan({
    project: projectInput,
    selectedTopic: project.selectedTopic as TopicCandidate
  });

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      researchPlan,
      stage: "方案已保存"
    }
  });

  return NextResponse.json(updated);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { markdown?: string };

  if (typeof body.markdown !== "string" || body.markdown.trim().length === 0) {
    return NextResponse.json({ error: "方案内容不能为空" }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      researchPlan: body.markdown,
      stage: "方案已保存"
    }
  });

  return NextResponse.json(updated);
}
