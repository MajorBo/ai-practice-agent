import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TopicCandidate } from "@/lib/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as { topic: TopicCandidate };

  if (!body.topic?.title) {
    return NextResponse.json({ error: "请选择有效选题" }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      selectedTopic: body.topic as unknown as Prisma.InputJsonValue,
      stage: "调研方案"
    }
  });

  return NextResponse.json(updated);
}
