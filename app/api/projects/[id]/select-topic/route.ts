import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "SERVER_STORAGE_DISABLED",
      message: "当前 MVP 使用浏览器本地存储，主选题保存请在前端 localStorage 完成。"
    },
    { status: 501 }
  );
}
