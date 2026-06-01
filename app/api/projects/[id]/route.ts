import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error: "SERVER_STORAGE_DISABLED",
      message: "当前 MVP 使用浏览器本地存储，项目详情请从 localStorage 读取。"
    },
    { status: 501 }
  );
}
