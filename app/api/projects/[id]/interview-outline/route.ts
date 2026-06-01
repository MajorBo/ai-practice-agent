import { NextResponse } from "next/server";
import { generateInterviewOutlineWithAI, getAIProviderStatus } from "@/lib/ai/aiService";
import type { InterviewOutlineForm, ProjectRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { form?: InterviewOutlineForm; project?: ProjectRecord };
    const project = body.project;
    const form = body.form;

    if (!project || !form) {
      return NextResponse.json({ error: "请在请求中提供项目和访谈设置" }, { status: 400 });
    }

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
