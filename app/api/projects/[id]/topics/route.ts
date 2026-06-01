import { NextResponse } from "next/server";
import { generateTopicCandidates } from "@/lib/aiService";
import { getProject, updateProject } from "@/lib/projectStore";
import type { ProjectInput } from "@/lib/types";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const project = await getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
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
    const updated = await updateProject(params.id, {
      topics,
      selectedTopic: null,
      researchPlan: null,
      stage: "选题设计"
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "选题生成失败" }, { status: 500 });
  }
}
