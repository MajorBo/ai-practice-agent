import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { InterviewOutlineForm, ProjectInput, ProjectRecord, TopicCandidate } from "@/lib/types";
import { buildInterviewOutlinePrompt, buildTopicPrompt } from "./prompts";

type JsonResult<T> =
  | { ok: true; data: T; raw: string }
  | { ok: false; raw: string; error: string };

const provider = process.env.AI_PROVIDER || "deepseek";

function getClient() {
  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com"
      }),
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
    };
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini"
    };
  }

  return null;
}

async function chat(messages: ChatCompletionMessageParam[]) {
  const config = getClient();
  if (!config) return null;

  const response = await config.client.chat.completions.create({
    model: config.model,
    temperature: 0.7,
    messages
  });

  return response.choices[0]?.message?.content || "";
}

function parseJson<T>(raw: string): JsonResult<T> {
  try {
    return { ok: true, data: JSON.parse(stripJsonFence(raw)) as T, raw };
  } catch (error) {
    return {
      ok: false,
      raw,
      error: error instanceof Error ? error.message : "JSON 解析失败"
    };
  }
}

function stripJsonFence(raw: string) {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function cleanInterviewOutlineMarkdown(raw: string) {
  try {
    const trimmed = raw.trim();
    const introPattern = /^(以下是|当然可以|根据你的需求|根据您提供|我为你|我为您|我已|好的|下面是|这是)/;
    const headingPattern = /^#{1,3}\s*(访谈提纲|暖场问题|事实性问题|过程性问题|案例追问|矛盾\/困难追问|困难\/矛盾追问|敏感问题替代表达|结束确认问题|记录提示)/m;
    const headingMatch = trimmed.match(headingPattern);

    if (introPattern.test(trimmed) && headingMatch?.index && headingMatch.index > 0) {
      return trimmed.slice(headingMatch.index).trim();
    }

    const secondLevelIndex = trimmed.search(/^##\s+/m);
    if (introPattern.test(trimmed) && secondLevelIndex > 0) {
      return trimmed.slice(secondLevelIndex).trim();
    }

    return trimmed;
  } catch {
    return raw;
  }
}

export async function generateTopicCandidatesWithAI(project: ProjectInput): Promise<TopicCandidate[] | null> {
  const raw = await chat([
    {
      role: "system",
      content: "你是高校社会实践调研方法专家。请严格按用户要求输出。"
    },
    {
      role: "user",
      content: buildTopicPrompt(project)
    }
  ]);

  if (!raw) return null;

  const parsed = parseJson<{ topics: TopicCandidate[] }>(raw);
  if (!parsed.ok) {
    console.warn("AI topic JSON parse failed:", parsed.error, parsed.raw);
    return null;
  }

  return Array.isArray(parsed.data.topics) ? parsed.data.topics : null;
}

export async function generateInterviewOutlineWithAI(project: ProjectRecord, form: InterviewOutlineForm): Promise<string | null> {
  const raw = await chat([
    {
      role: "system",
      content: "你是高校社会实践访谈设计专家。请直接输出可使用的 Markdown 访谈提纲，不要写前言或解释。"
    },
    {
      role: "user",
      content: buildInterviewOutlinePrompt(project, form)
    }
  ]);

  return raw ? cleanInterviewOutlineMarkdown(raw) : null;
}

export function getAIProviderStatus() {
  return {
    provider,
    hasDeepSeekKey: Boolean(process.env.DEEPSEEK_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY)
  };
}
