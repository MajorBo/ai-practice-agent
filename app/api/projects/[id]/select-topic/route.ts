import { NextResponse } from "next/server";
import { updateProject } from "@/lib/projectStore";
import type { TopicCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as { topic: TopicCandidate };

    if (!body.topic?.title) {
      return NextResponse.json({ error: "请选择有效选题" }, { status: 400 });
    }

    const updated = await updateProject(params.id, {
      selectedTopic: body.topic,
      stage: "调研方案"
    });

    if (!updated) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "主选题保存失败" }, { status: 500 });
  }
}
