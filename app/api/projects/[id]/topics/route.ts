import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { generateTopicCandidates } from "@/lib/aiService";
import { prisma } from "@/lib/prisma";
import type { ProjectInput } from "@/lib/types";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const projectInput: ProjectInput = {
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

  const topics = await generateTopicCandidates(projectInput);
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      topics: topics as unknown as Prisma.InputJsonValue,
      selectedTopic: null,
      researchPlan: null,
      stage: "选题设计"
    }
  });

  return NextResponse.json(updated);
}
