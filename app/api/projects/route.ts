import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projectStore";
import type { ProjectInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toProjectInput(body: Partial<ProjectInput>): ProjectInput {
  return {
    name: body.name?.trim() || "",
    practiceType: body.practiceType?.trim() || "",
    theme: body.theme?.trim() || "",
    location: body.location?.trim() || "",
    startDate: body.startDate || "",
    endDate: body.endDate || "",
    teamSize: Number(body.teamSize),
    expectedOutcome: body.expectedOutcome?.trim() || "",
    requirements: body.requirements?.trim() || ""
  };
}

function validateProject(input: ProjectInput) {
  const missing = [
    ["项目名称", input.name],
    ["实践类型", input.practiceType],
    ["实践主题", input.theme],
    ["实践地点", input.location],
    ["实践开始时间", input.startDate],
    ["实践结束时间", input.endDate],
    ["预期成果", input.expectedOutcome]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    return `请填写：${missing.map(([label]) => label).join("、")}`;
  }

  if (!Number.isFinite(input.teamSize) || input.teamSize <= 0) {
    return "团队人数必须大于 0";
  }

  if (new Date(input.startDate) > new Date(input.endDate)) {
    return "实践开始时间不能晚于结束时间";
  }

  return null;
}

export async function GET() {
  try {
    return NextResponse.json(await listProjects());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "项目列表加载失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProjectInput>;
    const input = toProjectInput(body);
    const validationError = validateProject(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const project = await createProject(input);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "项目创建失败" }, { status: 500 });
  }
}
