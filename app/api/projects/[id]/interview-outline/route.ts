import { NextResponse } from "next/server";
import { generateInterviewOutlineWithAI, getAIProviderStatus } from "@/lib/ai/aiService";
import { getProject } from "@/lib/projectStore";
import type { InterviewOutlineForm } from "@/lib/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const project = await getProject(params.id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const form = (await request.json()) as InterviewOutlineForm;
    const status = getAIProviderStatus();
    const hasConfiguredKey = status.provider === "openai" ? status.hasOpenAIKey : status.hasDeepSeekKey;

    if (!hasConfiguredKey) {
      return NextResponse.json({ markdown: null, fallback: true, source: "mock-missing-key" });
    }

    const markdown = await generateInterviewOutlineWithAI(project, form);

    if (!markdown) {
      return NextResponse.json({ markdown: null, fallback: true, source: "mock-api-error" });
    }

    return NextResponse.json({ markdown, fallback: false, source: "ai" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ markdown: null, fallback: true, source: "mock-api-error" });
  }
}
