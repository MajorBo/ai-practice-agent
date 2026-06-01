import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const disabledResponse = {
  error: "SERVER_STORAGE_DISABLED",
  message: "当前 MVP 使用浏览器本地存储，服务端文件写入在 Vercel 不可用。"
};

export async function GET() {
  return NextResponse.json(disabledResponse, { status: 501 });
}

export async function POST() {
  return NextResponse.json(disabledResponse, { status: 501 });
}
