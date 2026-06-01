import { NextResponse } from "next/server";
import { getProject } from "@/lib/projectStore";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const project = await getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "项目加载失败" }, { status: 500 });
  }
}
